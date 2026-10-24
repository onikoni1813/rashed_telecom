import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { reviewApprovalRequest } from "@/features/approvals/approval-service";
import { formatErrorResponse } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const reviewSchema = z.object({
  shopId: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewReason: z.string().min(2, "Review reason is required.").max(500),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { id: approvalRequestId } = await params;
    const rawBody = await req.json();
    const payload = reviewSchema.parse(rawBody);

    await requirePermission(authUser.id, payload.shopId, "approvals.review");

    const reviewed = await reviewApprovalRequest({
      shopId: payload.shopId,
      requestId: approvalRequestId,
      decision: payload.decision,
      reviewerId: authUser.id,
      reviewReason: payload.reviewReason,
    });

    const response: ApiSuccessResponse<typeof reviewed> = {
      data: reviewed,
      meta: { requestId },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
