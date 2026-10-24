import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requirePermission, assertShopAccess } from "@/lib/auth/guards";
import { formatErrorResponse, ValidationError, NotFoundError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "sales.view");

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        cashier: {
          select: { id: true, fullName: true, email: true },
        },
        items: {
          include: {
            product: true,
            serials: {
              include: { serialNumber: true },
            },
          },
        },
        paymentAllocations: {
          include: { payment: true },
        },
        returns: {
          include: { items: true },
        },
      },
    });

    if (!sale || sale.shopId !== shopId) {
      throw new NotFoundError("Sale invoice not found or access denied.");
    }

    assertShopAccess(sale.shopId, shopId);

    const payload: ApiSuccessResponse<typeof sale> = {
      data: sale,
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
