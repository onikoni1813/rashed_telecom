import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as batchSyncRoute } from "@/app/api/v1/sync/batch/route";
import { prisma } from "@/lib/db/prisma";
import { computeRequestHash } from "@/lib/idempotency/service";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    shopMember: {
      findUnique: vi.fn(),
    },
    location: {
      findFirst: vi.fn(),
    },
    customer: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    idempotencyKey: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/features/sales/sales-service", () => ({
  createSale: vi.fn().mockResolvedValue({ saleId: "sale-sync-101" }),
}));

vi.mock("@/features/repairs/repair-service", () => ({
  createServiceJob: vi.fn().mockResolvedValue({ id: "repair-sync-202" }),
}));

vi.mock("@/features/staff/staff-service", () => ({
  recordAttendance: vi.fn().mockResolvedValue({ id: "att-sync-303" }),
}));

vi.mock("@/features/accounting/accounting-service", () => ({
  recordExpense: vi.fn().mockResolvedValue({ id: "exp-sync-404" }),
}));

describe("Batch Sync API Integration (/api/v1/sync/batch)", () => {
  const shopId = "11111111-1111-1111-1111-111111111111";
  const userId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    vi.clearAllMocks();

    (prisma.shopMember.findUnique as any).mockResolvedValue({
      id: "member-1",
      shopId,
      userId,
      isActive: true,
      role: {
        name: "OWNER",
        rolePermissions: [],
      },
    });

    (prisma.location.findFirst as any).mockResolvedValue({
      id: "loc-default-1",
      isDefault: true,
    });

    (prisma.customer.findFirst as any).mockResolvedValue(null);
    (prisma.customer.create as any).mockResolvedValue({ id: "cust-created-1" });

    (prisma.idempotencyKey.findUnique as any).mockResolvedValue(null);
    (prisma.idempotencyKey.upsert as any).mockResolvedValue({} as any);
    (prisma.idempotencyKey.update as any).mockResolvedValue({} as any);
  });

  it("processes a batch of offline drafts and returns SYNCED status for each", async () => {
    const op1 = "11111111-aaaa-bbbb-cccc-111111111111";
    const op2 = "22222222-aaaa-bbbb-cccc-222222222222";

    const req = new Request("http://localhost/api/v1/sync/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user-id": userId,
      },
      body: JSON.stringify({
        shopId,
        items: [
          {
            outboxId: "outbox-1",
            operationId: op1,
            entityType: "SALE",
            schemaVersion: 1,
            payload: {
              items: [{ productId: "p-1", quantity: 1, unitPrice: 1500 }],
              payments: [{ method: "CASH", amount: 1500 }],
            },
          },
          {
            outboxId: "outbox-2",
            operationId: op2,
            entityType: "REPAIR",
            schemaVersion: 1,
            payload: {
              customerName: "Kamal Hossain",
              customerPhone: "01711999888",
              deviceBrand: "Xiaomi",
              deviceModel: "Redmi Note 12",
              reportedIssue: "Broken screen",
            },
          },
        ],
      }),
    });

    const res = await batchSyncRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.results).toHaveLength(2);
    expect(body.data.results[0].status).toBe("SYNCED");
    expect(body.data.results[0].serverEntityId).toBe("sale-sync-101");
    expect(body.data.results[1].status).toBe("SYNCED");
    expect(body.data.results[1].serverEntityId).toBe("repair-sync-202");
  });

  it("IDEMPOTENCY: returns previously cached result when operationId was already synced", async () => {
    const op1 = "11111111-aaaa-bbbb-cccc-111111111111";
    const payload = {
      items: [{ productId: "p-1", quantity: 1, unitPrice: 1500 }],
    };

    (prisma.idempotencyKey.findUnique as any).mockResolvedValueOnce({
      key: op1,
      shopId,
      status: "COMPLETED",
      statusCode: 200,
      requestHash: computeRequestHash(payload),
      responseBody: { id: "cached-sale-999" },
    });

    const req = new Request("http://localhost/api/v1/sync/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user-id": userId,
      },
      body: JSON.stringify({
        shopId,
        items: [
          {
            outboxId: "outbox-1",
            operationId: op1,
            entityType: "SALE",
            schemaVersion: 1,
            payload,
          },
        ],
      }),
    });

    const res = await batchSyncRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.results[0].status).toBe("SYNCED");
    expect(body.data.results[0].serverEntityId).toBe("cached-sale-999");

    const { createSale } = await import("@/features/sales/sales-service");
    expect(createSale).not.toHaveBeenCalled(); // Verified idempotent: did NOT re-run sale
  });

  it("CONFLICT HANDLING: marks item as CONFLICT when server domain logic detects stock mismatch", async () => {
    const op1 = "33333333-aaaa-bbbb-cccc-333333333333";

    const { createSale } = await import("@/features/sales/sales-service");
    vi.mocked(createSale).mockRejectedValueOnce(new Error("Insufficient stock available for product"));

    const req = new Request("http://localhost/api/v1/sync/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user-id": userId,
      },
      body: JSON.stringify({
        shopId,
        items: [
          {
            outboxId: "outbox-conflict",
            operationId: op1,
            entityType: "SALE",
            schemaVersion: 1,
            payload: {
              items: [{ productId: "p-1", quantity: 10, unitPrice: 1500 }],
            },
          },
        ],
      }),
    });

    const res = await batchSyncRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.results[0].status).toBe("CONFLICT");
    expect(body.data.results[0].error).toContain("Insufficient stock");
  });

  it("SECURITY GUARD: blocks requests from non-members with 403 Forbidden", async () => {
    (prisma.shopMember.findUnique as any).mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/v1/sync/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user-id": "unauthorized-user-uuid",
      },
      body: JSON.stringify({
        shopId,
        items: [],
      }),
    });

    const res = await batchSyncRoute(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error?.code).toBe("FORBIDDEN");
  });
});
