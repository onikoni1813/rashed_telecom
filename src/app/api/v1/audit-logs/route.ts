import { NextResponse } from "next/server";
import { requireAuth, requirePermission, assertShopAccess } from "@/lib/auth/guards";
import { queryAuditLogs } from "@/lib/audit/service";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const entityType = searchParams.get("entityType") || undefined;
    const entityId = searchParams.get("entityId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    // Require settings.view permission for this shop
    const member = await requirePermission(authUser.id, shopId, "settings.view");

    // Strictly enforce shop isolation: caller must be operating within their assigned shop
    assertShopAccess(shopId, member.shopId);

    const logs = await queryAuditLogs({
      shopId,
      entityType,
      entityId,
      limit,
      offset,
    });

    const payload: ApiSuccessResponse<typeof logs> = {
      data: logs,
      meta: {
        requestId,
        limit,
        offset,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
