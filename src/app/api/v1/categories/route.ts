import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const categorySchema = z.object({
  shopId: z.string().uuid(),
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().optional().nullable(),
  type: z.enum(["PHONE", "ACCESSORY", "PART", "CONSUMABLE"]).default("ACCESSORY"),
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

    await requirePermission(authUser.id, shopId, "products.view");

    const categories = await prisma.category.findMany({
      where: { shopId },
      include: {
        children: true,
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const payload: ApiSuccessResponse<typeof categories> = {
      data: categories,
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
    const parsed = categorySchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid category payload", parsed.error.format());
    }

    await requirePermission(authUser.id, parsed.data.shopId, "products.create");

    const category = await prisma.category.create({
      data: {
        shopId: parsed.data.shopId,
        name: parsed.data.name.trim(),
        parentId: parsed.data.parentId || null,
        type: parsed.data.type,
      },
    });

    const payload: ApiSuccessResponse<typeof category> = {
      data: category,
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
