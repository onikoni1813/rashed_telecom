import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requirePermission, assertShopAccess } from "@/lib/auth/guards";
import { updateProduct, deleteProduct } from "@/features/products/product-service";
import { formatErrorResponse, ValidationError, NotFoundError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const updateSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).max(255).optional(),
  brand: z.string().max(100).optional().nullable(),
  barcode: z.string().max(100).optional().nullable(),
  modelNumber: z.string().max(100).optional().nullable(),
  isTrackStock: z.boolean().optional(),
  costPrice: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  minStockAlert: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

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

    await requirePermission(authUser.id, shopId, "products.view");

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: true,
        stockBalances: {
          include: { location: true },
        },
        serialNumbers: {
          take: 50,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!product || product.shopId !== shopId) {
      throw new NotFoundError("Product not found or access denied.");
    }

    assertShopAccess(product.shopId, shopId);

    const payload: ApiSuccessResponse<typeof product> = {
      data: product,
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

export async function PATCH(
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

    await requirePermission(authUser.id, shopId, "products.update");

    const body = await req.json().catch(() => ({}));
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid update payload", parsed.error.format());
    }

    const updated = await updateProduct(id, shopId, parsed.data);

    const payload: ApiSuccessResponse<typeof updated> = {
      data: updated,
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

export async function DELETE(
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

    await requirePermission(authUser.id, shopId, "products.update");

    const result = await deleteProduct(id, shopId);

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
