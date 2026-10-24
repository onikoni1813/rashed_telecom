import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { getBalanceSheet } from "@/features/accounting/accounting-service";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const asOfDateStr = searchParams.get("asOfDate");

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "accounts.view_ledger");

    const asOfDate = asOfDateStr ? new Date(asOfDateStr) : undefined;
    const balanceSheet = await getBalanceSheet(shopId, asOfDate);

    const response: ApiSuccessResponse<typeof balanceSheet> = {
      data: balanceSheet,
      meta: { requestId },
    };

    return NextResponse.json(response);
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
