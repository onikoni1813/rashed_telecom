import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { consumeServicePart } from "@/features/repairs/repair-service";
import { executeWithIdempotency } from "@/lib/idempotency/service";
import { ApiSuccessResponse } from "@/types";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { id: jobId } = await params;
    const idempotencyKey = req.headers.get("idempotency-key") || req.headers.get("Idempotency-Key");
    const body = await req.json().catch(() => ({}));

    const {
      shopId,
      productId,
      variantId,
      locationId,
      quantity,
      requestedSellingPrice,
    } = body;

    if (!shopId || !productId || !locationId || !quantity) {
      throw new ValidationError(
        "Missing required fields: 'shopId', 'productId', 'locationId', and 'quantity'."
      );
    }

    await requirePermission(authUser.id, shopId, "service.consume_parts");

    const result = await executeWithIdempotency({
      shopId,
      idempotencyKey,
      payload: body,
      operation: async () => {
        const consumeResult = await consumeServicePart({
          shopId,
          jobId,
          productId,
          variantId,
          locationId,
          quantity: Number(quantity),
          requestedSellingPrice: requestedSellingPrice !== undefined ? Number(requestedSellingPrice) : undefined,
          consumedById: authUser.id,
        });

        return {
          statusCode: 201,
          data: consumeResult,
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
