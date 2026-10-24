import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { executeWithIdempotency } from "@/lib/idempotency/service";
import { receiveGoods } from "@/features/purchases/purchasing-service";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const receiveItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  quantity: z.number().int().positive(),
  unitCost: z.number().min(0),
  serials: z
    .array(
      z.object({
        imei1: z.string().optional(),
        imei2: z.string().optional(),
        serialNumber: z.string().optional(),
      })
    )
    .optional(),
});

const receiveSchema = z.object({
  shopId: z.string().uuid(),
  locationId: z.string().uuid(),
  notes: z.string().max(500).optional().nullable(),
  receivedItems: z.array(receiveItemSchema).min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { id: purchaseOrderId } = await params;
    const idempotencyKey = req.headers.get("idempotency-key");
    const body = await req.json().catch(() => ({}));
    const parsed = receiveSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid goods receipt payload", parsed.error.format());
    }

    await requirePermission(authUser.id, parsed.data.shopId, "purchases.receive");

    const result = await executeWithIdempotency({
      shopId: parsed.data.shopId,
      idempotencyKey,
      payload: { ...parsed.data, purchaseOrderId },
      operation: async () => {
        const receiptResult = await receiveGoods({
          shopId: parsed.data.shopId,
          purchaseOrderId,
          locationId: parsed.data.locationId,
          receivedItems: parsed.data.receivedItems,
          notes: parsed.data.notes,
          actorId: authUser.id,
        });

        return {
          statusCode: 201,
          data: receiptResult,
        };
      },
    });

    const payload: ApiSuccessResponse<typeof result.data> = {
      data: result.data,
      meta: {
        requestId,
        cached: result.cached,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(payload, { status: result.statusCode });
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
