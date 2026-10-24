import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const locationId = searchParams.get("locationId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "inventory.view");

    // Fetch stock balances
    const balances = await prisma.stockBalance.findMany({
      where: {
        shopId,
        ...(locationId ? { locationId } : {}),
      },
      include: {
        product: {
          include: { category: true },
        },
        variant: true,
        location: true,
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    });

    // Fetch recent stock movements for this shop
    const recentMovements = await prisma.stockMovement.findMany({
      where: {
        shopId,
        ...(locationId ? { locationId } : {}),
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
        variant: {
          select: { id: true, name: true },
        },
        location: {
          select: { id: true, name: true },
        },
        actor: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const payload: ApiSuccessResponse<{
      balances: typeof balances;
      recentMovements: typeof recentMovements;
    }> = {
      data: {
        balances,
        recentMovements,
      },
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
