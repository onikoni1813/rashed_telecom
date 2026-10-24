import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { executeWithIdempotency } from "@/lib/idempotency/service";
import { recordAuditLog } from "@/lib/audit/service";
import { formatErrorResponse, ValidationError, NotFoundError } from "@/lib/errors";
import { ApiSuccessResponse } from "@/types";

const addMemberSchema = z.object({
  shopId: z.string().uuid("Invalid shop ID format"),
  userId: z.string().uuid("Invalid user ID format"),
  roleId: z.string().uuid("Invalid role ID format"),
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

    // Require settings.view permission for this shop
    await requirePermission(authUser.id, shopId, "settings.view");

    const members = await prisma.shopMember.findMany({
      where: { shopId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            isActive: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const payload: ApiSuccessResponse<typeof members> = {
      data: members,
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
    const idempotencyKey = req.headers.get("idempotency-key");

    const rawBody = await req.json().catch(() => ({}));
    const parseResult = addMemberSchema.safeParse(rawBody);

    if (!parseResult.success) {
      throw new ValidationError("Invalid request payload", parseResult.error.format());
    }

    const { shopId, userId, roleId } = parseResult.data;

    // Enforce permission: settings.manage required to add/modify members
    await requirePermission(authUser.id, shopId, "settings.manage");

    // Execute through idempotency wrapper
    const result = await executeWithIdempotency({
      shopId,
      idempotencyKey,
      payload: parseResult.data,
      operation: async () => {
        // Verify role exists and belongs to this shop or is a system role
        const role = await prisma.role.findFirst({
          where: {
            id: roleId,
            OR: [{ shopId }, { isSystem: true }],
          },
        });

        if (!role) {
          throw new NotFoundError("Specified role not found or not accessible to this shop.");
        }

        // Verify target user exists
        const targetUser = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!targetUser) {
          throw new NotFoundError("Specified user not found.");
        }

        const member = await prisma.shopMember.upsert({
          where: {
            shopId_userId: {
              shopId,
              userId,
            },
          },
          update: {
            roleId,
            isActive: true,
          },
          create: {
            shopId,
            userId,
            roleId,
            isActive: true,
          },
          include: {
            role: true,
            user: true,
          },
        });

        // Record audit trail
        await recordAuditLog({
          shopId,
          actorId: authUser.id,
          action: "member.assign_role",
          entityType: "ShopMember",
          entityId: member.id,
          reason: "Role assigned by shop administrator",
          afterState: {
            userId: member.userId,
            roleId: member.roleId,
            roleName: member.role.name,
          },
        });

        return {
          statusCode: 201,
          data: {
            id: member.id,
            shopId: member.shopId,
            userId: member.userId,
            roleName: member.role.name,
            isActive: member.isActive,
          },
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
