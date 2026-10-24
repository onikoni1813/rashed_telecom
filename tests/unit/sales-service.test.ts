import { describe, it, expect, vi } from "vitest";
import { postJournalEntry } from "@/features/sales/accounting-posting";
import { createSale, processSaleReturn } from "@/features/sales/sales-service";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    account: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    journalEntry: {
      create: vi.fn(),
    },
    cashSession: {
      findFirst: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    serialNumber: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    sale: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    saleItemSerial: {
      create: vi.fn(),
    },
    payment: {
      count: vi.fn(),
      create: vi.fn(),
    },
    salesReturn: {
      count: vi.fn(),
      create: vi.fn(),
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
  },
}));

describe("Double-Entry Accounting & Journal Posting Engine", () => {
  const shopId = "11111111-1111-1111-1111-111111111111";

  it("strictly rejects unbalanced journal entries (Debits != Credits)", async () => {
    vi.mocked(prisma.account.findUnique).mockResolvedValue({ id: "acc-1" } as any);

    await expect(
      postJournalEntry({
        shopId,
        sourceType: "EXPENSE",
        sourceId: "src-1",
        description: "Unbalanced Entry Test",
        lines: [
          { accountCode: "1000", debit: 500 },
          { accountCode: "4000", credit: 400 }, // Off by 100
        ],
      })
    ).rejects.toThrow(ValidationError);
  });

  it("strictly rejects journal entries without lines", async () => {
    await expect(
      postJournalEntry({
        shopId,
        sourceType: "EXPENSE",
        sourceId: "src-2",
        description: "Empty Lines Test",
        lines: [],
      })
    ).rejects.toThrow(ValidationError);
  });

  it("accepts and posts balanced journal entries (Debits === Credits)", async () => {
    vi.mocked(prisma.account.findMany).mockResolvedValueOnce([
      { id: "acc-cash", code: "1000" },
      { id: "acc-sales", code: "4000" },
    ] as any);

    vi.mocked(prisma.journalEntry.create).mockResolvedValueOnce({
      id: "je-1",
      shopId,
      sourceType: "SALE",
      sourceId: "inv-1",
    } as any);

    const result = await postJournalEntry({
      shopId,
      sourceType: "SALE",
      sourceId: "inv-1",
      description: "POS Sale Journal",
      lines: [
        { accountCode: "1000", debit: 1000 },
        { accountCode: "4000", credit: 1000 },
      ],
    });

    expect(result.id).toBe("je-1");
    expect(prisma.journalEntry.create).toHaveBeenCalled();
  });
});

describe("POS Sales Service & Business Rules", () => {
  const shopId = "11111111-1111-1111-1111-111111111111";
  const cashierId = "00000000-0000-0000-0000-000000000001";
  const locationId = "33333333-3333-3333-3333-333333333333";
  const productId = "44444444-4444-4444-4444-444444444444";

  it("rejects sale creation when cart is empty", async () => {
    await expect(
      createSale({
        shopId,
        cashierId,
        locationId,
        items: [],
      })
    ).rejects.toThrow("Cannot create a sale without items.");
  });

  it("rejects sale when discount exceeds subtotal", async () => {
    vi.mocked(prisma.cashSession.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.product.findMany).mockResolvedValueOnce([
      {
        id: productId,
        shopId,
        name: "Screen Protector",
        sellingPrice: 150 as any,
        costPrice: 50 as any,
      } as any,
    ]);

    await expect(
      createSale({
        shopId,
        cashierId,
        locationId,
        items: [{ productId, quantity: 1 }],
        discount: 200, // Subtotal is 150
      })
    ).rejects.toThrow("Discount cannot exceed the total invoice subtotal.");
  });

  it("strictly forbids credit sales (due amount) for walk-in customers without customer ID", async () => {
    vi.mocked(prisma.cashSession.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.product.findMany).mockResolvedValueOnce([
      {
        id: productId,
        shopId,
        name: "Anker Charger",
        sellingPrice: 1200 as any,
        costPrice: 800 as any,
      } as any,
    ]);

    await expect(
      createSale({
        shopId,
        cashierId,
        locationId,
        items: [{ productId, quantity: 1 }],
        payments: [{ method: "CASH", amount: 500 }], // Total is 1200, due is 700 without customer
      })
    ).rejects.toThrow("Credit sale with due amount requires a registered customer.");
  });

  it("rejects sale when serial/IMEI count does not match item quantity", async () => {
    vi.mocked(prisma.cashSession.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.product.findMany).mockResolvedValueOnce([
      {
        id: productId,
        shopId,
        name: "Samsung Galaxy A15",
        sellingPrice: 18500 as any,
        costPrice: 16000 as any,
      } as any,
    ]);

    await expect(
      createSale({
        shopId,
        cashierId,
        locationId,
        items: [
          {
            productId,
            quantity: 2,
            serialNumberIds: ["serial-1"], // 1 serial for 2 quantity
          },
        ],
      })
    ).rejects.toThrow("Serial/IMEI count (1) must match item quantity (2).");
  });

  it("successfully creates a full cash sale and posts balanced entries", async () => {
    vi.mocked(prisma.cashSession.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.product.findMany).mockResolvedValueOnce([
      {
        id: productId,
        shopId,
        name: "Anker 20W Charger",
        sellingPrice: 1200 as any,
        costPrice: 800 as any,
      } as any,
    ]);

    vi.mocked(prisma.sale.count).mockResolvedValueOnce(0);
    vi.mocked(prisma.sale.create).mockResolvedValueOnce({
      id: "sale-101",
      shopId,
      invoiceNumber: "INV-000001",
      items: [
        {
          id: "item-101",
          productId,
          quantity: 1,
          unitPrice: 1200 as any,
          unitCost: 800 as any,
        },
      ],
    } as any);

    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
      id: productId,
      shopId,
      isTrackStock: true,
    } as any);

    vi.mocked(prisma.stockBalance.findFirst).mockResolvedValueOnce({
      id: "bal-1",
      shopId,
      productId,
      locationId,
      quantityOnHand: 5,
      averageCost: 800 as any,
    } as any);

    vi.mocked(prisma.stockBalance.update).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.stockMovement.create).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.payment.count).mockResolvedValueOnce(0);
    vi.mocked(prisma.payment.create).mockResolvedValueOnce({ id: "pay-1" } as any);
    vi.mocked(prisma.account.findMany).mockResolvedValue([
      { id: "acc-1000", code: "1000" },
      { id: "acc-1010", code: "1010" },
      { id: "acc-1100", code: "1100" },
      { id: "acc-1200", code: "1200" },
      { id: "acc-4000", code: "4000" },
      { id: "acc-5000", code: "5000" },
    ] as any);
    vi.mocked(prisma.journalEntry.create).mockResolvedValueOnce({ id: "je-sale" } as any);

    const saleResult = await createSale({
      shopId,
      cashierId,
      locationId,
      items: [{ productId, quantity: 1 }],
      payments: [{ method: "CASH", amount: 1200 }],
    });

    expect(saleResult.saleId).toBe("sale-101");
    expect(saleResult.invoiceNumber).toBe("INV-000001");
    expect(saleResult.totalAmount).toBe(1200);
    expect(saleResult.paidAmount).toBe(1200);
    expect(saleResult.dueAmount).toBe(0);
    expect(saleResult.paymentStatus).toBe("PAID");
  });
});

describe("Sales Return & Reversals", () => {
  const shopId = "11111111-1111-1111-1111-111111111111";
  const returnedBy = "00000000-0000-0000-0000-000000000001";
  const locationId = "33333333-3333-3333-3333-333333333333";
  const saleId = "sale-101";
  const saleItemId = "item-101";
  const productId = "44444444-4444-4444-4444-444444444444";

  it("strictly rejects return if return quantity exceeds purchased quantity", async () => {
    vi.mocked(prisma.sale.findUnique).mockResolvedValueOnce({
      id: saleId,
      shopId,
      invoiceNumber: "INV-000001",
      items: [
        {
          id: saleItemId,
          productId,
          quantity: 1,
          unitPrice: 1200 as any,
          unitCost: 800 as any,
          serials: [],
          returnItems: [],
        },
      ],
      customer: null,
    } as any);

    await expect(
      processSaleReturn({
        shopId,
        saleId,
        returnedBy,
        locationId,
        refundMethod: "CASH",
        items: [{ saleItemId, quantity: 2 }], // Sold only 1
      })
    ).rejects.toThrow("Cannot return 2 units of product; only 1 remaining returnable.");
  });

  it("successfully processes return, restocks inventory, and posts balanced journal reversal", async () => {
    vi.mocked(prisma.sale.findUnique).mockResolvedValueOnce({
      id: saleId,
      shopId,
      customerId: null,
      invoiceNumber: "INV-000001",
      dueAmount: 0 as any,
      items: [
        {
          id: saleItemId,
          productId,
          variantId: null,
          quantity: 1,
          unitPrice: 1200 as any,
          unitCost: 800 as any,
          serials: [],
          returnItems: [],
        },
      ],
      customer: null,
    } as any);

    vi.mocked(prisma.salesReturn.count).mockResolvedValueOnce(0);
    vi.mocked(prisma.salesReturn.create).mockResolvedValueOnce({
      id: "ret-1",
      returnNumber: "RET-000001",
    } as any);

    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
      id: productId,
      shopId,
      isTrackStock: true,
    } as any);

    vi.mocked(prisma.stockBalance.findFirst).mockResolvedValueOnce({
      id: "bal-1",
      shopId,
      productId,
      locationId,
      quantityOnHand: 4,
      averageCost: 800 as any,
    } as any);

    vi.mocked(prisma.stockBalance.update).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.stockMovement.create).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.account.findMany).mockResolvedValue([
      { id: "acc-1000", code: "1000" },
      { id: "acc-1010", code: "1010" },
      { id: "acc-1100", code: "1100" },
      { id: "acc-1200", code: "1200" },
      { id: "acc-4000", code: "4000" },
      { id: "acc-5000", code: "5000" },
    ] as any);
    vi.mocked(prisma.journalEntry.create).mockResolvedValueOnce({ id: "je-ret" } as any);

    const returnResult = await processSaleReturn({
      shopId,
      saleId,
      returnedBy,
      locationId,
      refundMethod: "CASH",
      items: [{ saleItemId, quantity: 1 }],
      returnReason: "Customer changed mind",
    });

    expect(returnResult.returnNumber).toBe("RET-000001");
    expect(returnResult.refundAmount).toBe(1200);
    expect(returnResult.refundMethod).toBe("CASH");
  });
});
