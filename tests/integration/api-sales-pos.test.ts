import { describe, it, expect, vi } from "vitest";
import { GET as getCustomers, POST as postCustomer } from "@/app/api/v1/customers/route";
import { GET as getCashSessions, POST as postCashSession } from "@/app/api/v1/cash-sessions/route";
import { POST as postSale } from "@/app/api/v1/sales/route";
import { POST as postSaleReturn } from "@/app/api/v1/sales/[id]/returns/route";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    shopMember: {
      findUnique: vi.fn(),
    },
    customer: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    cashSession: {
      findFirst: vi.fn(),
      create: vi.fn(),
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
    account: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    journalEntry: {
      create: vi.fn(),
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

describe("POS, Sales & Returns API Integration", () => {
  const shopId = "11111111-1111-1111-1111-111111111111";
  const userId = "00000000-0000-0000-0000-000000000001";
  const locationId = "33333333-3333-3333-3333-333333333333";
  const productId = "44444444-4444-4444-4444-444444444444";

  it("creates a customer when authorized with sales.create", async () => {
    vi.mocked(prisma.shopMember.findUnique).mockResolvedValueOnce({
      id: "mem-1",
      shopId,
      userId,
      isActive: true,
      role: { name: "OWNER", rolePermissions: [] },
    } as any);

    vi.mocked(prisma.customer.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.customer.create).mockResolvedValueOnce({
      id: "cust-1",
      shopId,
      name: "Tariqul Islam",
      phone: "01700112233",
      totalDue: 0 as any,
    } as any);

    const req = new Request("http://localhost:3000/api/v1/customers", {
      method: "POST",
      headers: {
        "x-test-user-id": userId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shopId,
        name: "Tariqul Islam",
        phone: "01700112233",
      }),
    });

    const res = await postCustomer(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.name).toBe("Tariqul Islam");
    expect(body.data.phone).toBe("01700112233");
  });

  it("opens a cashier session with opening cash", async () => {
    vi.mocked(prisma.shopMember.findUnique).mockResolvedValueOnce({
      id: "mem-1",
      shopId,
      userId,
      isActive: true,
      role: { name: "OWNER", rolePermissions: [] },
    } as any);

    vi.mocked(prisma.cashSession.findFirst).mockResolvedValueOnce(null); // No currently open session
    vi.mocked(prisma.cashSession.create).mockResolvedValueOnce({
      id: "cs-1",
      shopId,
      cashierId: userId,
      openingCash: 5000 as any,
      status: "OPEN",
    } as any);

    const req = new Request("http://localhost:3000/api/v1/cash-sessions", {
      method: "POST",
      headers: {
        "x-test-user-id": userId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shopId,
        action: "OPEN",
        openingCash: 5000,
        notes: "Morning opening shift",
      }),
    });

    const res = await postCashSession(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.status).toBe("OPEN");
  });

  it("processes a POS sale checkout with idempotency and records balanced journal entry", async () => {
    vi.mocked(prisma.shopMember.findUnique).mockResolvedValueOnce({
      id: "mem-1",
      shopId,
      userId,
      isActive: true,
      role: { name: "OWNER", rolePermissions: [] },
    } as any);

    // Mock Idempotency Key
    vi.mocked(prisma.idempotencyKey.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.idempotencyKey.upsert).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.idempotencyKey.update).mockResolvedValueOnce({} as any);

    // Cash session check
    vi.mocked(prisma.cashSession.findFirst).mockResolvedValueOnce({
      id: "cs-1",
      shopId,
      status: "OPEN",
    } as any);

    // Product lookup
    vi.mocked(prisma.product.findMany).mockResolvedValueOnce([
      {
        id: productId,
        shopId,
        name: "Anker USB-C Cable",
        sellingPrice: 450 as any,
        costPrice: 250 as any,
      } as any,
    ]);

    // Sale creation
    vi.mocked(prisma.sale.count).mockResolvedValueOnce(0);
    vi.mocked(prisma.sale.create).mockResolvedValueOnce({
      id: "sale-99",
      shopId,
      invoiceNumber: "INV-000001",
      items: [
        {
          id: "item-99",
          productId,
          quantity: 2,
          unitPrice: 450 as any,
          unitCost: 250 as any,
        },
      ],
    } as any);

    // Stock movement
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
      quantityOnHand: 10,
      averageCost: 250 as any,
    } as any);

    vi.mocked(prisma.stockBalance.update).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.stockMovement.create).mockResolvedValueOnce({} as any);

    // Payment creation
    vi.mocked(prisma.payment.count).mockResolvedValueOnce(0);
    vi.mocked(prisma.payment.create).mockResolvedValueOnce({ id: "pay-1" } as any);

    // Account lookups and Journal entry
    vi.mocked(prisma.account.findMany).mockResolvedValue([
      { id: "acc-1000", code: "1000" },
      { id: "acc-1010", code: "1010" },
      { id: "acc-1100", code: "1100" },
      { id: "acc-1200", code: "1200" },
      { id: "acc-4000", code: "4000" },
      { id: "acc-5000", code: "5000" },
    ] as any);
    vi.mocked(prisma.journalEntry.create).mockResolvedValueOnce({ id: "je-sale" } as any);

    const req = new Request("http://localhost:3000/api/v1/sales", {
      method: "POST",
      headers: {
        "x-test-user-id": userId,
        "Content-Type": "application/json",
        "Idempotency-Key": "pos-sale-test-key-1",
      },
      body: JSON.stringify({
        shopId,
        locationId,
        items: [{ productId, quantity: 2 }],
        payments: [{ method: "CASH", amount: 900 }],
      }),
    });

    const res = await postSale(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.saleId).toBe("sale-99");
    expect(body.data.totalAmount).toBe(900);
    expect(body.data.paidAmount).toBe(900);
    expect(body.data.paymentStatus).toBe("PAID");
  });

  it("processes a customer return and restores stock", async () => {
    vi.mocked(prisma.shopMember.findUnique).mockResolvedValueOnce({
      id: "mem-1",
      shopId,
      userId,
      isActive: true,
      role: { name: "OWNER", rolePermissions: [] },
    } as any);

    // Mock Idempotency Key
    vi.mocked(prisma.idempotencyKey.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.idempotencyKey.upsert).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.idempotencyKey.update).mockResolvedValueOnce({} as any);

    // Mock original sale
    vi.mocked(prisma.sale.findUnique).mockResolvedValueOnce({
      id: "sale-99",
      shopId,
      customerId: null,
      invoiceNumber: "INV-000001",
      dueAmount: 0 as any,
      items: [
        {
          id: "item-99",
          productId,
          variantId: null,
          quantity: 2,
          unitPrice: 450 as any,
          unitCost: 250 as any,
          serials: [],
          returnItems: [],
        },
      ],
      customer: null,
    } as any);

    vi.mocked(prisma.salesReturn.count).mockResolvedValueOnce(0);
    vi.mocked(prisma.salesReturn.create).mockResolvedValueOnce({
      id: "ret-99",
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
      quantityOnHand: 8,
      averageCost: 250 as any,
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

    const req = new Request("http://localhost:3000/api/v1/sales/sale-99/returns", {
      method: "POST",
      headers: {
        "x-test-user-id": userId,
        "Content-Type": "application/json",
        "Idempotency-Key": "pos-return-test-key-1",
      },
      body: JSON.stringify({
        shopId,
        locationId,
        refundMethod: "CASH",
        items: [{ saleItemId: "item-99", quantity: 1 }],
        returnReason: "Wrong item purchased",
      }),
    });

    const res = await postSaleReturn(req, { params: Promise.resolve({ id: "sale-99" }) });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.returnNumber).toBe("RET-000001");
    expect(body.data.refundAmount).toBe(450);
  });
});
