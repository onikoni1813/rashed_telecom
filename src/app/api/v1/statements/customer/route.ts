import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { getCustomerStatement } from "@/features/statements/statement-service";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const customerId = searchParams.get("customerId");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }
    if (!customerId) {
      throw new ValidationError("Missing required query parameter: 'customerId'");
    }

    await requirePermission(authUser.id, shopId, "sales.view");

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const statement = await getCustomerStatement(shopId, customerId, startDate, endDate);

    const response: ApiSuccessResponse<typeof statement> = {
      data: statement,
      meta: { requestId },
    };

    return NextResponse.json(response);
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
