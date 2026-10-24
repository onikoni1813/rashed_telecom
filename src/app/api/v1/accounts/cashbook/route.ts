import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { getCashbook } from "@/features/accounting/accounting-service";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "accounts.view_ledger");

    const cashbook = await getCashbook(shopId, limit);

    const response: ApiSuccessResponse<typeof cashbook> = {
      data: cashbook,
      meta: { requestId },
    };

    return NextResponse.json(response);
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
