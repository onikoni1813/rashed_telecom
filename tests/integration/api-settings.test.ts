import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getSettingsRoute, PATCH as patchSettingsRoute } from "@/app/api/v1/settings/route";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    shopMember: {
      findUnique: vi.fn(),
    },
    shop: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("Settings API Integration Tests (/api/v1/settings)", () => {
  const shopId = "11111111-1111-1111-1111-111111111111";
  const ownerId = "00000000-0000-0000-0000-000000000001";
  const unauthorizedId = "00000000-0000-0000-0000-000000000003";

  beforeEach(() => {
    vi.clearAllMocks();

    (prisma.shopMember.findUnique as any).mockImplementation(({ where }: any) => {
      const uId = where?.shopId_userId?.userId || where?.userId_shopId?.userId;
      if (uId === ownerId) {
        return Promise.resolve({
          id: "member-owner",
          shopId,
          userId: ownerId,
          isActive: true,
          role: {
            name: "OWNER",
            rolePermissions: [],
          },
        });
      }
      if (uId === unauthorizedId) {
        return Promise.resolve({
          id: "member-guest",
          shopId,
          userId: unauthorizedId,
          isActive: true,
          role: {
            name: "GUEST",
            rolePermissions: [],
          },
        });
      }
      return Promise.resolve(null);
    });
  });

  describe("GET /api/v1/settings", () => {
    it("returns 400 if shopId parameter is missing", async () => {
      const req = new Request("http://localhost/api/v1/settings", {
        headers: { "x-test-user-id": ownerId },
      });

      const res = await getSettingsRoute(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error?.message).toContain("Missing required query parameter: 'shopId'");
    });

    it("returns 403 if user lacks settings.view permission", async () => {
      const req = new Request(`http://localhost/api/v1/settings?shopId=${shopId}`, {
        headers: { "x-test-user-id": unauthorizedId },
      });

      const res = await getSettingsRoute(req);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.error?.code).toBe("FORBIDDEN");
    });

    it("returns shop settings successfully for OWNER", async () => {
      (prisma.shop.findUnique as any).mockResolvedValue({
        id: shopId,
        name: "Rashed Telecom",
        currency: "BDT",
        timezone: "Asia/Dhaka",
        settings: { phone: "01700000000" },
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
        roles: [],
        _count: { products: 10, customers: 5, staffProfiles: 2, sales: 50 },
      });

      const req = new Request(`http://localhost/api/v1/settings?shopId=${shopId}`, {
        headers: { "x-test-user-id": ownerId },
      });

      const res = await getSettingsRoute(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.name).toBe("Rashed Telecom");
      expect(body.data.settings.phone).toBe("01700000000");
      expect(body.data.stats.totalProducts).toBe(10);
    });
  });

  describe("PATCH /api/v1/settings", () => {
    it("returns 403 if user lacks settings.manage permission", async () => {
      const req = new Request("http://localhost/api/v1/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": unauthorizedId,
        },
        body: JSON.stringify({ shopId, name: "New Name" }),
      });

      const res = await patchSettingsRoute(req);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.error?.code).toBe("FORBIDDEN");
    });

    it("updates shop profile and settings successfully for OWNER", async () => {
      (prisma.shop.findUnique as any)
        .mockResolvedValueOnce({
          id: shopId,
          name: "Rashed Telecom",
          currency: "BDT",
          timezone: "Asia/Dhaka",
          settings: { phone: "01700000000" },
        })
        .mockResolvedValueOnce({
          id: shopId,
          name: "Rashed Telecom Updated",
          currency: "BDT",
          timezone: "Asia/Dhaka",
          settings: { phone: "01711998877", receiptPaperSize: "58mm" },
          createdAt: new Date(),
          updatedAt: new Date(),
          members: [],
          roles: [],
          _count: { products: 10, customers: 5, staffProfiles: 2, sales: 50 },
        });

      (prisma.shop.update as any).mockResolvedValue({
        id: shopId,
        name: "Rashed Telecom Updated",
        currency: "BDT",
        timezone: "Asia/Dhaka",
        settings: { phone: "01711998877", receiptPaperSize: "58mm" },
      });

      const req = new Request("http://localhost/api/v1/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": ownerId,
        },
        body: JSON.stringify({
          shopId,
          name: "Rashed Telecom Updated",
          settings: { phone: "01711998877", receiptPaperSize: "58mm" },
        }),
      });

      const res = await patchSettingsRoute(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.name).toBe("Rashed Telecom Updated");
      expect(body.data.settings.receiptPaperSize).toBe("58mm");
    });
  });
});
