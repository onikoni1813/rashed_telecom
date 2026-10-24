import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/guards";
import { formatErrorResponse } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const authUser = await requireAuth(req);

    // Fetch user details and active shop memberships from database
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            shop: {
              select: {
                id: true,
                name: true,
                currency: true,
                timezone: true,
              },
            },
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const responseData = {
      user: {
        id: authUser.id,
        email: authUser.email,
        fullName: user?.fullName || null,
        phone: user?.phone || null,
      },
      memberships:
        user?.memberships.map((m) => ({
          shopId: m.shopId,
          shopName: m.shop.name,
          currency: m.shop.currency,
          timezone: m.shop.timezone,
          role: m.role.name,
          permissions: m.role.rolePermissions.map((rp) => rp.permission.key),
        })) || [],
    };

    const payload: ApiSuccessResponse<typeof responseData> = {
      data: responseData,
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
