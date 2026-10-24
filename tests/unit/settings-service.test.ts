import { describe, it, expect, vi, beforeEach } from "vitest";
import { getShopSettings, updateShopSettings } from "@/features/settings/settings-service";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    shop: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("Settings Service Unit Tests", () => {
  const shopId = "11111111-1111-1111-1111-111111111111";
  const actorId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getShopSettings", () => {
    it("throws NotFoundError when shop does not exist", async () => {
      (prisma.shop.findUnique as any).mockResolvedValue(null);

      await expect(getShopSettings("non-existent-shop")).rejects.toThrow(NotFoundError);
    });

    it("returns serialized shop settings with merged defaults and counts", async () => {
      (prisma.shop.findUnique as any).mockResolvedValue({
        id: shopId,
        name: "Rashed Telecom",
        currency: "BDT",
        timezone: "Asia/Dhaka",
        settings: {
          phone: "01711223344",
          receiptPaperSize: "80mm",
        },
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-10-24T12:00:00Z"),
        members: [
          {
            id: "mem-1",
            userId: actorId,
            isActive: true,
            user: { fullName: "Rashed Ahmed", email: "rashed@telecom.bd", phone: "01700000000" },
            role: { name: "OWNER" },
          },
        ],
        roles: [
          {
            id: "role-1",
            name: "OWNER",
            description: "Owner role",
            rolePermissions: [{ id: "rp-1" }, { id: "rp-2" }],
          },
        ],
        _count: {
          products: 25,
          customers: 120,
          staffProfiles: 3,
          sales: 450,
        },
      });

      const result = await getShopSettings(shopId);

      expect(result.id).toBe(shopId);
      expect(result.name).toBe("Rashed Telecom");
      expect(result.settings.phone).toBe("01711223344");
      expect(result.settings.receiptPaperSize).toBe("80mm");
      expect(result.settings.currency).toBeUndefined(); // inside settings config
      expect(result.currency).toBe("BDT");
      expect(result.stats.totalProducts).toBe(25);
      expect(result.stats.totalSales).toBe(450);
      expect(result.members).toHaveLength(1);
      expect(result.roles[0].permissionCount).toBe(2);
    });
  });

  describe("updateShopSettings", () => {
    it("throws ValidationError when shop name is empty", async () => {
      (prisma.shop.findUnique as any).mockResolvedValue({
        id: shopId,
        name: "Rashed Telecom",
        settings: {},
      });

      await expect(
        updateShopSettings(shopId, actorId, { name: "   " })
      ).rejects.toThrow(ValidationError);
    });

    it("successfully updates settings and records audit log", async () => {
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
          name: "Rashed Telecom & Lab",
          currency: "BDT",
          timezone: "Asia/Dhaka",
          settings: { phone: "01799887766", serviceWarrantyDays: 45 },
          createdAt: new Date(),
          updatedAt: new Date(),
          members: [],
          roles: [],
          _count: { products: 0, customers: 0, staffProfiles: 0, sales: 0 },
        });

      (prisma.shop.update as any).mockResolvedValue({
        id: shopId,
        name: "Rashed Telecom & Lab",
        currency: "BDT",
        timezone: "Asia/Dhaka",
        settings: { phone: "01799887766", serviceWarrantyDays: 45 },
      });

      const result = await updateShopSettings(shopId, actorId, {
        name: "Rashed Telecom & Lab",
        settings: { phone: "01799887766", serviceWarrantyDays: 45 },
      });

      expect(prisma.shop.update).toHaveBeenCalledWith({
        where: { id: shopId },
        data: expect.objectContaining({
          name: "Rashed Telecom & Lab",
          settings: expect.objectContaining({
            phone: "01799887766",
            serviceWarrantyDays: 45,
          }),
        }),
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          shopId,
          actorId,
          action: "settings.update",
          entityType: "Shop",
        }),
      });

      expect(result.name).toBe("Rashed Telecom & Lab");
    });
  });
});
