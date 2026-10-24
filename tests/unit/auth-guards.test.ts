import { describe, it, expect, vi } from "vitest";
import { requireAuth, assertShopAccess, requirePermission } from "@/lib/auth/guards";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    shopMember: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Server-Side Auth and Permission Guards", () => {
  it("rejects request when Authorization header is missing", async () => {
    const req = new Request("http://localhost:3000/api/v1/auth/me");
    // Ensure test bypass header is absent
    await expect(requireAuth(req)).rejects.toThrow(UnauthorizedError);
  });

  it("rejects request when Bearer token is empty", async () => {
    const req = new Request("http://localhost:3000/api/v1/auth/me", {
      headers: { Authorization: "Bearer " },
    });
    await expect(requireAuth(req)).rejects.toThrow(UnauthorizedError);
  });

  it("allows simulated test authentication when x-test-user-id is supplied", async () => {
    const req = new Request("http://localhost:3000/api/v1/auth/me", {
      headers: {
        "x-test-user-id": "user-123",
        "x-test-user-email": "admin@rashedtelecom.local",
      },
    });
    const user = await requireAuth(req);
    expect(user.id).toBe("user-123");
    expect(user.email).toBe("admin@rashedtelecom.local");
  });

  it("throws ForbiddenError when cross-shop access is attempted", () => {
    const shopA = "11111111-1111-1111-1111-111111111111";
    const shopB = "22222222-2222-2222-2222-222222222222";

    expect(() => assertShopAccess(shopA, shopB)).toThrow(ForbiddenError);
    expect(() => assertShopAccess(shopA, "")).toThrow(ForbiddenError);
    expect(() => assertShopAccess("", shopB)).toThrow(ForbiddenError);
  });

  it("allows access when shop IDs match", () => {
    const shopA = "11111111-1111-1111-1111-111111111111";
    expect(() => assertShopAccess(shopA, shopA)).not.toThrow();
  });

  it("allows OWNER role all permissions unconditionally", async () => {
    vi.mocked(prisma.shopMember.findUnique).mockResolvedValueOnce({
      id: "member-1",
      shopId: "shop-1",
      userId: "user-owner",
      roleId: "role-owner",
      isActive: true,
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      role: {
        id: "role-owner",
        name: "OWNER",
        description: "Owner",
        shopId: null,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        rolePermissions: [],
      },
    } as any);

    const member = await requirePermission("user-owner", "shop-1", "settings.manage");
    expect(member.roleName).toBe("OWNER");
  });

  it("rejects member when missing required permission", async () => {
    vi.mocked(prisma.shopMember.findUnique).mockResolvedValueOnce({
      id: "member-2",
      shopId: "shop-1",
      userId: "user-cashier",
      roleId: "role-cashier",
      isActive: true,
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      role: {
        id: "role-cashier",
        name: "CASHIER",
        description: "Cashier",
        shopId: null,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        rolePermissions: [
          {
            id: "rp-1",
            roleId: "role-cashier",
            permissionId: "p-1",
            createdAt: new Date(),
            permission: {
              id: "p-1",
              key: "sales.create",
              description: "Create sales",
              module: "sales",
              createdAt: new Date(),
            },
          },
        ],
      },
    } as any);

    await expect(
      requirePermission("user-cashier", "shop-1", "settings.manage")
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects inactive member", async () => {
    vi.mocked(prisma.shopMember.findUnique).mockResolvedValueOnce({
      id: "member-3",
      shopId: "shop-1",
      userId: "user-inactive",
      roleId: "role-1",
      isActive: false,
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      role: {
        id: "role-1",
        name: "MANAGER",
        rolePermissions: [],
      },
    } as any);

    await expect(
      requirePermission("user-inactive", "shop-1", "dashboard.view")
    ).rejects.toThrow(ForbiddenError);
  });
});
