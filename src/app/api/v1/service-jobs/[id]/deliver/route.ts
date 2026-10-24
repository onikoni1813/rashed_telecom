import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { deliverServiceJob } from "@/features/repairs/repair-service";
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
      paymentMethod,
      paidAmount,
      warrantyDays,
      warrantyTerms,
      notes,
    } = body;

    if (!shopId || !paymentMethod || paidAmount === undefined) {
      throw new ValidationError(
        "Missing required delivery fields: 'shopId', 'paymentMethod', and 'paidAmount'."
      );
    }

    await requirePermission(authUser.id, shopId, "service.deliver");

    const result = await executeWithIdempotency({
      shopId,
      idempotencyKey,
      payload: body,
      operation: async () => {
        const deliveredJob = await deliverServiceJob({
          shopId,
          jobId,
          deliveredById: authUser.id,
          paymentMethod,
          paidAmount: Number(paidAmount),
          warrantyDays: warrantyDays !== undefined ? Number(warrantyDays) : 30,
          warrantyTerms,
          notes,
        });

        return {
          statusCode: 200,
          data: deliveredJob,
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
