import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { getProfitAndLoss } from "@/features/accounting/accounting-service";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "reports.view_profit");

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const pnl = await getProfitAndLoss(shopId, startDate, endDate);

    const response: ApiSuccessResponse<typeof pnl> = {
      data: pnl,
      meta: { requestId },
    };

    return NextResponse.json(response);
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
