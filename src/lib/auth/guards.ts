import { prisma } from "@/lib/db/prisma";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { PermissionKey } from "@/lib/permissions";
import { createServerSupabaseClient } from "./supabase-server";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface ShopMemberDetails {
  memberId: string;
  userId: string;
  shopId: string;
  roleId: string;
  roleName: string;
  permissions: string[];
}

/**
 * Extracts and verifies the authenticated user from the HTTP request.
 * Checks Authorization header using Supabase Auth.
 */
export async function requireAuth(req: Request): Promise<AuthenticatedUser> {
  const authHeader = req.headers.get("authorization");

  // In development and test environments, allow simulated authentication via header
  if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") {
    const testUserId = req.headers.get("x-test-user-id");
    if (testUserId) {
      return {
        id: testUserId,
        email: req.headers.get("x-test-user-email") || "admin@rashedtelecom.local",
      };
    }
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Authentication token is missing or invalid.");
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    throw new UnauthorizedError("Authentication bearer token is empty.");
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedError(error?.message || "Invalid authentication session.");
    }

    return {
      id: data.user.id,
      email: data.user.email,
      phone: data.user.phone,
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError("Failed to verify authentication session.");
  }
}

/**
 * Ensures the user has an active membership in the specified shop.
 */
export async function requireShopMember(
  userId: string,
  shopId: string
): Promise<ShopMemberDetails> {
  if (!shopId) {
    throw new ForbiddenError("Shop identifier is required.");
  }

  const member = await prisma.shopMember.findUnique({
    where: {
      shopId_userId: {
        shopId,
        userId,
      },
    },
    include: {
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
  });

  if (!member || !member.isActive) {
    throw new ForbiddenError("You are not an active member of this shop.");
  }

  const permissions = member.role.rolePermissions.map((rp) => rp.permission.key);

  return {
    memberId: member.id,
    userId: member.userId,
    shopId: member.shopId,
    roleId: member.roleId,
    roleName: member.role.name,
    permissions,
  };
}

/**
 * Ensures the authenticated user has the required permission for the target shop.
 */
export async function requirePermission(
  userId: string,
  shopId: string,
  requiredPermission: PermissionKey
): Promise<ShopMemberDetails> {
  const member = await requireShopMember(userId, shopId);

  // OWNER role has all permissions implicitly
  if (member.roleName === "OWNER") {
    return member;
  }

  if (!member.permissions.includes(requiredPermission)) {
    throw new ForbiddenError(
      `Permission denied: '${requiredPermission}' is required for this operation.`
    );
  }

  return member;
}

/**
 * Asserts that an entity's shopId matches the user's active shop context.
 * Strictly prevents cross-shop data leaks or mutations.
 */
export function assertShopAccess(entityShopId: string, userShopId: string): void {
  if (!entityShopId || !userShopId || entityShopId !== userShopId) {
    throw new ForbiddenError("Cross-shop access is strictly forbidden.");
  }
}
