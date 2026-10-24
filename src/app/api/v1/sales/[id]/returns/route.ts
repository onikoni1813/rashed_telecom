import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { processSaleReturn } from "@/features/sales/sales-service";
import { executeWithIdempotency } from "@/lib/idempotency/service";
import { ApiSuccessResponse } from "@/types";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { id: saleId } = await params;
    const body = await req.json();

    const {
      shopId,
      locationId,
      refundMethod,
      items,
      returnReason,
    } = body;

    if (!shopId || !locationId || !refundMethod || !items) {
      throw new ValidationError(
        "Missing required return fields: 'shopId', 'locationId', 'refundMethod', 'items'"
      );
    }

    await requirePermission(authUser.id, shopId, "sales.refund");

    const idempotencyKey = req.headers.get("Idempotency-Key") || req.headers.get("idempotency-key");

    const result = await executeWithIdempotency({
      shopId,
      idempotencyKey,
      payload: body,
      operation: async () => {
        const retResult = await processSaleReturn({
          shopId,
          saleId,
          returnedBy: authUser.id,
          locationId,
          refundMethod,
          items,
          returnReason,
        });

        return {
          statusCode: 201,
          data: retResult,
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
