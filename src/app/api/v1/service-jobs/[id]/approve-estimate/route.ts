import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { approveEstimate } from "@/features/repairs/repair-service";
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

    const { shopId, approved, notes } = body;

    if (!shopId || typeof approved !== "boolean") {
      throw new ValidationError("Missing required fields: 'shopId' and 'approved' (boolean).");
    }

    await requirePermission(authUser.id, shopId, "service.approve_estimate");

    const result = await executeWithIdempotency({
      shopId,
      idempotencyKey,
      payload: body,
      operation: async () => {
        const updatedJob = await approveEstimate({
          shopId,
          jobId,
          approved,
          actorId: authUser.id,
          notes,
        });

        return {
          statusCode: 200,
          data: updatedJob,
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
