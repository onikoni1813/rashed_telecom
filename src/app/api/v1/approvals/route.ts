import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { createApprovalRequest, getApprovalRequests } from "@/features/approvals/approval-service";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const createApprovalSchema = z.object({
  shopId: z.string().uuid(),
  requestType: z.enum([
    "STOCK_ADJUSTMENT",
    "LARGE_DISCOUNT",
    "SALARY_PAYOUT",
    "DUE_WAIVER",
    "EXPENSE_APPROVAL",
  ]),
  referenceId: z.string().max(100).optional().nullable(),
  details: z.record(z.unknown()).optional(),
});

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const status = searchParams.get("status") || undefined;

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "approvals.view");

    const requests = await getApprovalRequests(shopId, status);

    const response: ApiSuccessResponse<typeof requests> = {
      data: requests,
      meta: { requestId },
    };

    return NextResponse.json(response);
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const rawBody = await req.json();
    const payload = createApprovalSchema.parse(rawBody);

    // Any authenticated shop member can submit an approval request
    await requirePermission(authUser.id, payload.shopId, "dashboard.view");

    const request = await createApprovalRequest({
      shopId: payload.shopId,
      requestType: payload.requestType,
      referenceId: payload.referenceId,
      requestedById: authUser.id,
      details: payload.details,
    });

    const response: ApiSuccessResponse<typeof request> = {
      data: request,
      meta: { requestId },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
