import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import {
  getPerformanceAnalytics,
  AnalyticsPeriod,
} from "@/features/dashboard/analytics-service";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const period = (searchParams.get("period") || "today") as AnalyticsPeriod;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    // Optional auth check for secure multi-tenant access
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const authUser = await requireAuth(req);
      await requirePermission(authUser.id, shopId, "reports.view_profit");
    }

    const analytics = await getPerformanceAnalytics({
      shopId,
      period,
      startDate,
      endDate,
    });

    const response: ApiSuccessResponse<typeof analytics> = {
      data: analytics,
      meta: { requestId },
    };

    return NextResponse.json(response);
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
