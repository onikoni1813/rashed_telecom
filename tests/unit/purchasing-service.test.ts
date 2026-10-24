import { describe, it, expect, vi } from "vitest";
import {
  createPurchaseOrder,
  receiveGoods,
} from "@/features/purchases/purchasing-service";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    supplier: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    purchaseOrder: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    purchaseOrderItem: {
      update: vi.fn(),
      findMany: vi.fn(),
    },
    goodsReceipt: {
      count: vi.fn(),
      create: vi.fn(),
    },
    goodsReceiptItem: {
      create: vi.fn(),
    },
    serialNumber: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("Purchasing and Goods Receiving Domain Service", () => {
  const shopId = "11111111-1111-1111-1111-111111111111";
  const supplierId = "22222222-2222-2222-2222-222222222222";
  const productId = "33333333-3333-3333-3333-333333333333";

  it("creates a purchase order with ORDERED status without altering stock balances", async () => {
    vi.mocked(prisma.supplier.findUnique).mockResolvedValueOnce({
      id: supplierId,
      shopId,
      name: "Smart Tech",
    } as any);

    vi.mocked(prisma.purchaseOrder.count).mockResolvedValueOnce(0);
    vi.mocked(prisma.purchaseOrder.create).mockResolvedValueOnce({
      id: "po-1",
      shopId,
      supplierId,
      poNumber: "PO-00001",
      status: "ORDERED",
      totalAmount: 185000 as any,
      items: [
        {
          id: "item-1",
          productId,
          quantity: 10,
          unitCost: 18500 as any,
          receivedQuantity: 0,
        },
      ],
      supplier: { id: supplierId, name: "Smart Tech" },
    } as any);

    const po = await createPurchaseOrder({
      shopId,
      supplierId,
      items: [{ productId, quantity: 10, unitCost: 18500 }],
    });

    expect(po.poNumber).toBe("PO-00001");
    expect(po.status).toBe("ORDERED");
    expect(po.items[0].receivedQuantity).toBe(0);
  });

  it("rejects purchase order with zero or negative items", async () => {
    await expect(
      createPurchaseOrder({
        shopId,
        supplierId,
        items: [],
      })
    ).rejects.toThrow(ValidationError);
  });

  it("rejects goods receipt when received quantity exceeds ordered quantity", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      const mockTx = {
        purchaseOrder: {
          findUnique: vi.fn().mockResolvedValue({
            id: "po-1",
            shopId,
            poNumber: "PO-00001",
            status: "ORDERED",
            supplierId,
            items: [
              {
                id: "item-1",
                productId,
                quantity: 5,
                receivedQuantity: 0,
              },
            ],
          }),
        },
        goodsReceipt: {
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn(),
        },
      };
      return await callback(mockTx);
    });

    await expect(
      receiveGoods({
        shopId,
        purchaseOrderId: "po-1",
        locationId: "loc-1",
        receivedItems: [{ productId, quantity: 10, unitCost: 100 }], // 10 exceeds 5!
      })
    ).rejects.toThrow(ValidationError);
  });
});
