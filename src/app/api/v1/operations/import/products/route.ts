import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { importProducts } from "@/features/operations/import-export-service";
import { formatErrorResponse } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const importProductsSchema = z.object({
  shopId: z.string().uuid(),
  products: z
    .array(
      z.object({
        name: z.string().min(1, "Product name is required."),
        sku: z.string().min(1, "SKU is required."),
        categoryName: z.string().default("General"),
        costPrice: z.number().min(0).default(0),
        sellingPrice: z.number().min(0, "Selling price must be non-negative."),
        brand: z.string().optional(),
        barcode: z.string().optional(),
        minStockAlert: z.number().int().min(0).optional(),
      })
    )
    .min(1, "At least one product is required for import."),
});

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const rawBody = await req.json();
    const payload = importProductsSchema.parse(rawBody);

    await requirePermission(authUser.id, payload.shopId, "data.import");

    const result = await importProducts(payload.shopId, payload.products, authUser.id);

    const response: ApiSuccessResponse<typeof result> = {
      data: result,
      meta: { requestId },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
