import { describe, it, expect, vi } from "vitest";
import { POST as postProduct, GET as getProducts } from "@/app/api/v1/products/route";
import { POST as postAdjustment } from "@/app/api/v1/inventory/adjustments/route";
import { GET as getReconciliation } from "@/app/api/v1/inventory/reconcile/route";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    shopMember: {
      findUnique: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    stockBalance: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    idempotencyKey: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("Products & Inventory API Integration", () => {
  const shopId = "11111111-1111-1111-1111-111111111111";
  const userId = "00000000-0000-0000-0000-000000000001";
  const categoryId = "44444444-4444-4444-4444-444444444444";
  const locationId = "55555555-5555-5555-5555-555555555555";
  const productId = "66666666-6666-6666-6666-666666666666";

  it("creates a product when authorized with products.create", async () => {
    vi.mocked(prisma.shopMember.findUnique).mockResolvedValueOnce({
      id: "mem-1",
      shopId,
      userId,
      isActive: true,
      role: { name: "OWNER", rolePermissions: [] },
    } as any);

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
      id: categoryId,
      shopId,
      name: "Smartphones",
    } as any);

    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce(null); // SKU available

    vi.mocked(prisma.product.create).mockResolvedValueOnce({
      id: productId,
      shopId,
      categoryId,
      name: "Samsung Galaxy A15",
      sku: "SAM-A15-01",
      costPrice: 18000 as any,
      sellingPrice: 21500 as any,
      minStockAlert: 5,
      isTrackStock: true,
      isActive: true,
      createdAt: new Date(),
      category: { id: categoryId, name: "Smartphones" },
      stockBalances: [],
    } as any);

    const req = new Request("http://localhost:3000/api/v1/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user-id": userId,
      },
      body: JSON.stringify({
        shopId,
        categoryId,
        name: "Samsung Galaxy A15",
        sku: "SAM-A15-01",
        costPrice: 18000,
        sellingPrice: 21500,
      }),
    });

    const response = await postProduct(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.name).toBe("Samsung Galaxy A15");
    expect(body.data.sku).toBe("SAM-A15-01");
  });

  it("rejects product creation when SKU already exists in the same shop (409 CONFLICT)", async () => {
    vi.mocked(prisma.shopMember.findUnique).mockResolvedValueOnce({
      id: "mem-1",
      shopId,
      userId,
      isActive: true,
      role: { name: "OWNER", rolePermissions: [] },
    } as any);

    vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
      id: categoryId,
      shopId,
      name: "Smartphones",
    } as any);

    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
      id: "existing-prod",
      shopId,
      sku: "SAM-A15-01",
    } as any);

    const req = new Request("http://localhost:3000/api/v1/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user-id": userId,
      },
      body: JSON.stringify({
        shopId,
        categoryId,
        name: "Duplicate Samsung",
        sku: "SAM-A15-01",
      }),
    });

    const response = await postProduct(req);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });

  it("records a manual stock adjustment with reason", async () => {
    vi.mocked(prisma.shopMember.findUnique).mockResolvedValueOnce({
      id: "mem-1",
      shopId,
      userId,
      isActive: true,
      role: { name: "OWNER", rolePermissions: [] },
    } as any);

    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
      id: productId,
      shopId,
      name: "Samsung A15",
      isTrackStock: true,
    } as any);

    vi.mocked(prisma.stockBalance.findFirst).mockResolvedValueOnce({
      id: "bal-1",
      shopId,
      productId,
      variantId: null,
      locationId,
      quantityOnHand: 10 as any,
      averageCost: 18000 as any,
    } as any);

    vi.mocked(prisma.stockBalance.update).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.stockMovement.create).mockResolvedValueOnce({
      id: "mov-adj-1",
      shopId,
      productId,
      locationId,
      movementType: "ADJUSTMENT_IN",
      quantity: 5 as any,
      balanceAfter: 15 as any,
    } as any);

    const req = new Request("http://localhost:3000/api/v1/inventory/adjustments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-test-user-id": userId,
      },
      body: JSON.stringify({
        shopId,
        productId,
        locationId,
        quantity: 5,
        unitCost: 18000,
        reason: "Found in backstore warehouse audit",
      }),
    });

    const response = await postAdjustment(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.movementType).toBe("ADJUSTMENT_IN");
    expect(body.data.quantityOnHand).toBe(15);
  });

  it("checks stock balance reconciliation against movements sum", async () => {
    vi.mocked(prisma.shopMember.findUnique).mockResolvedValueOnce({
      id: "mem-1",
      shopId,
      userId,
      isActive: true,
      role: { name: "OWNER", rolePermissions: [] },
    } as any);

    vi.mocked(prisma.stockBalance.findFirst).mockResolvedValueOnce({
      id: "bal-1",
      shopId,
      productId,
      variantId: null,
      locationId,
      quantityOnHand: 20 as any,
      averageCost: 500 as any,
    } as any);

    vi.mocked(prisma.stockMovement.aggregate).mockResolvedValueOnce({
      _sum: {
        quantity: 20 as any,
      },
    } as any);

    const req = new Request(
      `http://localhost:3000/api/v1/inventory/reconcile?shopId=${shopId}&productId=${productId}&locationId=${locationId}`,
      {
        headers: { "x-test-user-id": userId },
      }
    );

    const response = await getReconciliation(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.isReconciled).toBe(true);
    expect(body.data.discrepancy).toBe(0);
  });
});
