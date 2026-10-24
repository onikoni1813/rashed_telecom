import { describe, it, expect, vi } from "vitest";
import { sanitizeAuditState, recordAuditLog } from "@/lib/audit/service";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("Audit Trail Service", () => {
  it("redacts sensitive fields like passwords, secrets, and PINs", () => {
    const rawState = {
      username: "staff_rashed",
      password: "PlainTextPassword123!",
      pin: "1234",
      devicePin: "9988",
      token: "secret-bearer-token",
      role: "CASHIER",
      nested: {
        secret: "super-secret-key",
        normalKey: "visible-value",
      },
    };

    const sanitized = sanitizeAuditState(rawState);

    expect(sanitized).toEqual({
      username: "staff_rashed",
      password: "[REDACTED]",
      pin: "[REDACTED]",
      devicePin: "[REDACTED]",
      token: "[REDACTED]",
      role: "CASHIER",
      nested: {
        secret: "[REDACTED]",
        normalKey: "visible-value",
      },
    });
  });

  it("handles null or undefined state gracefully", () => {
    expect(sanitizeAuditState(null)).toBeNull();
    expect(sanitizeAuditState(undefined)).toBeNull();
  });

  it("persists sanitized audit log entry into database", async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({
      id: "audit-1",
      shopId: "shop-1",
      actorId: "actor-1",
      action: "user.role_change",
      entityType: "ShopMember",
      entityId: "mem-1",
      reason: "Promotion",
      beforeState: { role: "CASHIER" },
      afterState: { role: "MANAGER" },
      ipAddress: "127.0.0.1",
      userAgent: "Vitest/1.0",
      createdAt: new Date(),
    } as any);

    const log = await recordAuditLog({
      shopId: "shop-1",
      actorId: "actor-1",
      action: "user.role_change",
      entityType: "ShopMember",
      entityId: "mem-1",
      reason: "Promotion",
      beforeState: { role: "CASHIER", password: "secret" },
      afterState: { role: "MANAGER" },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        shopId: "shop-1",
        actorId: "actor-1",
        action: "user.role_change",
        beforeState: { role: "CASHIER", password: "[REDACTED]" },
        afterState: { role: "MANAGER" },
      }),
    });
    expect(log.id).toBe("audit-1");
  });
});
