import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { executeWithIdempotency } from "@/lib/idempotency/service";
import { createSale } from "@/features/sales/sales-service";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const saleItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  quantity: z.number().int().positive(),
  requestedPrice: z.number().min(0).optional(),
  serialNumberIds: z.array(z.string().uuid()).optional(),
});

const paymentSplitSchema = z.object({
  method: z.enum(["CASH", "BANK", "BKASH", "NAGAD", "ROCKET"]),
  amount: z.number().min(0),
  referenceNumber: z.string().max(100).optional(),
});

const createSaleSchema = z.object({
  shopId: z.string().uuid(),
  customerId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid(),
  items: z.array(saleItemSchema).min(1),
  discount: z.number().min(0).default(0),
  payments: z.array(paymentSplitSchema).default([]),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const customerId = searchParams.get("customerId") || undefined;
    const paymentStatus = searchParams.get("paymentStatus") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "sales.view");

    const sales = await prisma.sale.findMany({
      where: {
        shopId,
        ...(customerId ? { customerId } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
      },
      include: {
        customer: true,
        cashier: {
          select: { id: true, fullName: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
        paymentAllocations: {
          include: { payment: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const payload: ApiSuccessResponse<typeof sales> = {
      data: sales,
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
    const idempotencyKey = req.headers.get("idempotency-key");
    const body = await req.json().catch(() => ({}));
    const parsed = createSaleSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid sale checkout payload", parsed.error.format());
    }

    await requirePermission(authUser.id, parsed.data.shopId, "sales.create");

    const result = await executeWithIdempotency({
      shopId: parsed.data.shopId,
      idempotencyKey,
      payload: parsed.data,
      operation: async () => {
        const saleResult = await createSale({
          shopId: parsed.data.shopId,
          customerId: parsed.data.customerId || null,
          cashierId: authUser.id,
          locationId: parsed.data.locationId,
          items: parsed.data.items,
          discount: parsed.data.discount,
          payments: parsed.data.payments,
          notes: parsed.data.notes,
        });

        return {
          statusCode: 201,
          data: saleResult,
        };
      },
    });

    const payload: ApiSuccessResponse<typeof result.data> = {
      data: result.data,
      meta: {
        requestId,
        cached: result.cached,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(payload, { status: result.statusCode });
  } catch (err) {
    const { status, body } = formatErrorResponse(err, requestId);
    return NextResponse.json(body, { status });
  }
}
