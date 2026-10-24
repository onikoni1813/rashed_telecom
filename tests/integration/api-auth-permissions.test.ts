import { describe, it, expect, vi } from "vitest";
import { GET as getMe } from "@/app/api/v1/auth/me/route";
import { GET as getMembers, POST as postMember } from "@/app/api/v1/shop-members/route";
import { GET as getAuditLogs } from "@/app/api/v1/audit-logs/route";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    role: {
      findFirst: vi.fn(),
    },
    shopMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    idempotencyKey: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("API Security, Authorization, and Cross-Shop Isolation", () => {
  const shopA = "11111111-1111-1111-1111-111111111111";
  const shopB = "22222222-2222-2222-2222-222222222222";
  const validUserId = "33333333-3333-3333-3333-333333333333";
  const validRoleId = "44444444-4444-4444-4444-444444444444";

  it("rejects unauthenticated request to /api/v1/auth/me with 401 UNAUTHORIZED", async () => {
    const req = new Request("http://localhost:3000/api/v1/auth/me");
    const response = await getMe(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects unauthenticated request to /api/v1/shop-members with 401 UNAUTHORIZED", async () => {
    const req = new Request(`http://localhost:3000/api/v1/shop-members?shopId=${shopA}`);
    const response = await getMembers(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects unauthorized user lacking settings.manage when adding a member (403 FORBIDDEN)", async () => {
    // User is Cashier in shopA without settings.manage
    vi.mocked(prisma.shopMember.findUnique).mockResolvedValueOnce({
      id: "mem-cashier",
      shopId: shopA,
      userId: validUserId,
      roleId: validRoleId,
      isActive: true,
      role: {
        id: validRoleId,
        name: "CASHIER",
        rolePermissions: [],
      },
    } as any);

    const req = new Request("http://localhost:3000/api/v1/shop-members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user-id": validUserId,
      },
      body: JSON.stringify({
        shopId: shopA,
        userId: "55555555-5555-5555-5555-555555555555",
        roleId: validRoleId,
      }),
    });

    const response = await postMember(req);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
    expect(body.error.message).toContain("settings.manage");
  });

  it("rejects cross-shop access when user attempts to view audit logs of a foreign shop (403 FORBIDDEN)", async () => {
    // User is an active member of shopA, but requests audit logs of shopB
    vi.mocked(prisma.shopMember.findUnique).mockResolvedValueOnce(null); // Not a member of shopB!

    const req = new Request(`http://localhost:3000/api/v1/audit-logs?shopId=${shopB}`, {
      headers: {
        "x-test-user-id": validUserId,
      },
    });

    const response = await getAuditLogs(req);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
    expect(body.error.message).toContain("not an active member");
  });

  it("allows authorized OWNER to query shop members", async () => {
    vi.mocked(prisma.shopMember.findUnique).mockResolvedValueOnce({
      id: "mem-owner",
      shopId: shopA,
      userId: validUserId,
      roleId: validRoleId,
      isActive: true,
      role: {
        id: validRoleId,
        name: "OWNER",
        rolePermissions: [],
      },
    } as any);

    vi.mocked(prisma.shopMember.findMany).mockResolvedValueOnce([
      {
        id: "mem-1",
        shopId: shopA,
        userId: validUserId,
        roleId: validRoleId,
        isActive: true,
        joinedAt: new Date(),
        user: { id: validUserId, email: "admin@rashedtelecom.local", fullName: "Admin", isActive: true },
        role: { id: validRoleId, name: "OWNER", description: "Owner" },
      },
    ] as any);

    const req = new Request(`http://localhost:3000/api/v1/shop-members?shopId=${shopA}`, {
      headers: {
        "x-test-user-id": validUserId,
      },
    });

    const response = await getMembers(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].role.name).toBe("OWNER");
    expect(body.meta.requestId).toBeDefined();
  });
});
