import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { formatErrorResponse, ValidationError, ConflictError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const customerSchema = z.object({
  shopId: z.string().uuid(),
  name: z.string().min(1).max(100),
  phone: z.string().min(6).max(20),
  email: z.string().email().optional().nullable(),
  address: z.string().max(255).optional().nullable(),
});

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId");
    const search = searchParams.get("search") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (!shopId) {
      throw new ValidationError("Missing required query parameter: 'shopId'");
    }

    await requirePermission(authUser.id, shopId, "sales.view");

    const customers = await prisma.customer.findMany({
      where: {
        shopId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const payload: ApiSuccessResponse<typeof customers> = {
      data: customers,
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
    const parsed = customerSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid customer payload", parsed.error.format());
    }

    await requirePermission(authUser.id, parsed.data.shopId, "sales.create");

    // Check unique phone within shop
    const existing = await prisma.customer.findUnique({
      where: {
        shopId_phone: {
          shopId: parsed.data.shopId,
          phone: parsed.data.phone.trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictError(`Customer with phone '${parsed.data.phone}' already exists.`);
    }

    const customer = await prisma.customer.create({
      data: {
        shopId: parsed.data.shopId,
        name: parsed.data.name.trim(),
        phone: parsed.data.phone.trim(),
        email: parsed.data.email?.trim() || null,
        address: parsed.data.address?.trim() || null,
      },
    });

    const payload: ApiSuccessResponse<typeof customer> = {
      data: customer,
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
