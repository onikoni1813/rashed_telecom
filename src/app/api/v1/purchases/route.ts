import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { executeWithIdempotency } from "@/lib/idempotency/service";
import { createPurchaseOrder } from "@/features/purchases/purchasing-service";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const poItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  quantity: z.number().int().positive(),
  unitCost: z.number().min(0),
});

const createPoSchema = z.object({
  shopId: z.string().uuid(),
  supplierId: z.string().uuid(),
  expectedAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(poItemSchema).min(1),
});

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const supplierId = searchParams.get("supplierId") || undefined;
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "purchases.view");

    const orders = await prisma.purchaseOrder.findMany({
      where: {
        shopId,
        ...(supplierId ? { supplierId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
        goodsReceipts: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const payload: ApiSuccessResponse<typeof orders> = {
      data: orders,
      meta: {
        requestId,
        limit,
        offset,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const idempotencyKey = req.headers.get("idempotency-key");
    const body = await req.json().catch(() => ({}));
    const parsed = createPoSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid purchase order payload", parsed.error.format());
    }

    await requirePermission(authUser.id, parsed.data.shopId, "purchases.create");

    const result = await executeWithIdempotency({
      shopId: parsed.data.shopId,
      idempotencyKey,
      payload: parsed.data,
      operation: async () => {
        const po = await createPurchaseOrder({
          shopId: parsed.data.shopId,
          supplierId: parsed.data.supplierId,
          expectedAt: parsed.data.expectedAt ? new Date(parsed.data.expectedAt) : null,
          notes: parsed.data.notes,
          items: parsed.data.items,
          actorId: authUser.id,
        });

        return {
          statusCode: 201,
          data: po,
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
