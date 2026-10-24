import { describe, it, expect, vi } from "vitest";
import {
  calculateWeightedAverageCost,
  recordStockMovement,
  reconcileStockBalance,
} from "@/features/inventory/stock-service";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
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
  },
}));

describe("Stock Ledger and Valuation Domain Service", () => {
  const shopId = "11111111-1111-1111-1111-111111111111";
  const productId = "22222222-2222-2222-2222-222222222222";
  const locationId = "33333333-3333-3333-3333-333333333333";

  it("calculates weighted average cost correctly for incoming inventory", () => {
    // Current: 10 units @ ৳100 = ৳1000
    // Incoming: 5 units @ ৳130 = ৳650
    // Total: 15 units, Total Val: ৳1650 -> Avg: ৳110
    const avgCost = calculateWeightedAverageCost(10, 100, 5, 130);
    expect(avgCost).toBe(110);
  });

  it("handles initial stock purchase when current stock is zero", () => {
    const avgCost = calculateWeightedAverageCost(0, 0, 10, 250);
    expect(avgCost).toBe(250);
  });

  it("prevents negative stock on tracked physical products", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
      id: productId,
      shopId,
      name: "Samsung Galaxy A15",
      isTrackStock: true,
    } as any);

    vi.mocked(prisma.stockBalance.findFirst).mockResolvedValueOnce({
      id: "bal-1",
      shopId,
      productId,
      variantId: null,
      locationId,
      quantityOnHand: 2 as any,
      averageCost: 18000 as any,
    } as any);

    // Attempting to deduct 5 units when only 2 on hand
    await expect(
      recordStockMovement({
        shopId,
        productId,
        locationId,
        movementType: "SALE",
        quantity: -5,
        unitCost: 18000,
      })
    ).rejects.toThrow(ValidationError);
  });

  it("records stock movement and updates stock balance atomically", async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
      id: productId,
      shopId,
      name: "Type-C Cable",
      isTrackStock: true,
    } as any);

    vi.mocked(prisma.stockBalance.findFirst).mockResolvedValueOnce({
      id: "bal-1",
      shopId,
      productId,
      variantId: null,
      locationId,
      quantityOnHand: 10 as any,
      averageCost: 100 as any,
    } as any);

    vi.mocked(prisma.stockBalance.update).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.stockMovement.create).mockResolvedValueOnce({
      id: "mov-1",
      shopId,
      productId,
      variantId: null,
      locationId,
      movementType: "PURCHASE_RECEIPT",
      quantity: 10 as any,
      unitCost: 120 as any,
      balanceAfter: 20 as any,
      createdAt: new Date(),
    } as any);

    const result = await recordStockMovement({
      shopId,
      productId,
      locationId,
      movementType: "PURCHASE_RECEIPT",
      quantity: 10,
      unitCost: 120,
    });

    expect(result.quantityOnHand).toBe(20);
    expect(result.averageCost).toBe(110);
    expect(prisma.stockMovement.create).toHaveBeenCalled();
  });

  it("reconciles stock balance against sum of historical stock movements", async () => {
    vi.mocked(prisma.stockBalance.findFirst).mockResolvedValueOnce({
      id: "bal-1",
      shopId,
      productId,
      variantId: null,
      locationId,
      quantityOnHand: 25 as any,
      averageCost: 150 as any,
    } as any);

    vi.mocked(prisma.stockMovement.aggregate).mockResolvedValueOnce({
      _sum: {
        quantity: 25 as any,
      },
    } as any);

    const result = await reconcileStockBalance({
      shopId,
      productId,
      locationId,
    });

    expect(result.isReconciled).toBe(true);
    expect(result.balanceOnHand).toBe(25);
    expect(result.movementSum).toBe(25);
    expect(result.discrepancy).toBe(0);
  });
});
