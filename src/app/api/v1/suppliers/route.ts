import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { formatErrorResponse, ValidationError, ConflictError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const supplierSchema = z.object({
  shopId: z.string().uuid(),
  name: z.string().min(1).max(150),
  contactPerson: z.string().max(100).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(255).optional().nullable(),
});

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "purchases.view");

    const suppliers = await prisma.supplier.findMany({
      where: { shopId },
      orderBy: { name: "asc" },
    });

    const payload: ApiSuccessResponse<typeof suppliers> = {
      data: suppliers,
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

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const parsed = supplierSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid supplier payload", parsed.error.format());
    }

    await requirePermission(authUser.id, parsed.data.shopId, "purchases.create");

    // Check unique supplier name within shop
    const existing = await prisma.supplier.findUnique({
      where: {
        shopId_name: {
          shopId: parsed.data.shopId,
          name: parsed.data.name.trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictError(`Supplier '${parsed.data.name}' already exists in this shop.`);
    }

    const supplier = await prisma.supplier.create({
      data: {
        shopId: parsed.data.shopId,
        name: parsed.data.name.trim(),
        contactPerson: parsed.data.contactPerson?.trim() || null,
        phone: parsed.data.phone?.trim() || null,
        email: parsed.data.email?.trim() || null,
        address: parsed.data.address?.trim() || null,
      },
    });

    const payload: ApiSuccessResponse<typeof supplier> = {
      data: supplier,
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
