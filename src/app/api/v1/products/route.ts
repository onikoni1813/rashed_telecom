import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { createProduct, getProducts } from "@/features/products/product-service";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const createProductSchema = z.object({
  shopId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(255),
  brand: z.string().max(100).optional().nullable(),
  sku: z.string().min(1).max(100),
  barcode: z.string().max(100).optional().nullable(),
  modelNumber: z.string().max(100).optional().nullable(),
  isTrackStock: z.boolean().default(true),
  costPrice: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
  minStockAlert: z.number().int().min(0).default(5),
});

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const categoryId = searchParams.get("categoryId") || undefined;
    const search = searchParams.get("search") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "products.view");

    const products = await getProducts({
      shopId,
      categoryId,
      search,
      limit,
      offset,
    });

    const payload: ApiSuccessResponse<typeof products> = {
      data: products,
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

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const parsed = createProductSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid product payload", parsed.error.format());
    }

    await requirePermission(authUser.id, parsed.data.shopId, "products.create");

    const product = await createProduct(parsed.data);

    const payload: ApiSuccessResponse<typeof product> = {
      data: product,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(payload, { status: 201 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
