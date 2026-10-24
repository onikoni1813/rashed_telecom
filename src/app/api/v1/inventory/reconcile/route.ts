import { NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { reconcileStockBalance } from "@/features/inventory/stock-service";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const productId = searchParams.get("productId");
    const locationId = searchParams.get("locationId");
    const variantId = searchParams.get("variantId") || undefined;

    if (!shopId || !productId || !locationId) {
      throw new ValidationError(
        "Missing required query parameters: 'shopId', 'productId', 'locationId'"
      );
    }

    await requirePermission(authUser.id, shopId, "inventory.view");

    const result = await reconcileStockBalance({
      shopId,
      productId,
      variantId,
      locationId,
    });

    const payload: ApiSuccessResponse<typeof result> = {
      data: result,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
