import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getExpenses, POST as postExpense } from "@/app/api/v1/expenses/route";
import { GET as getLedger } from "@/app/api/v1/accounts/ledger/route";
import { GET as getTrialBalanceRoute } from "@/app/api/v1/accounts/trial-balance/route";
import { GET as getProfitLossRoute } from "@/app/api/v1/reports/profit-loss/route";
import { POST as collectDueRoute } from "@/app/api/v1/dues/collect/route";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    shopMember: {
      findUnique: vi.fn(),
    },
    expense: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    expenseCategory: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    account: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    journalEntry: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      count: vi.fn(),
      create: vi.fn(),
    },
    accountingPeriod: {
      findFirst: vi.fn(),
    },
    idempotencyKey: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("Accounting & Finance API Integration", () => {
  const shopId = "11111111-1111-1111-1111-111111111111";
  const userId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    vi.clearAllMocks();

    // Default authenticated shop member with OWNER role
    (prisma.shopMember.findUnique as any).mockResolvedValue({
      id: "member-admin",
      shopId,
      userId,
      isActive: true,
      role: {
        name: "OWNER",
        rolePermissions: [],
      },
    });

    (prisma.idempotencyKey.findUnique as any).mockResolvedValue(null);
    (prisma.idempotencyKey.upsert as any).mockResolvedValue({} as any);
    (prisma.idempotencyKey.update as any).mockResolvedValue({} as any);
  });

  describe("GET /api/v1/expenses", () => {
    it("should return list of expenses and categories", async () => {
      (prisma.expense.findMany as any).mockResolvedValue([
        {
          id: "exp-1",
          expenseNumber: "EXP-000001",
          amount: new Prisma.Decimal(2500),
          category: { name: "Electricity" },
          account: { code: "6000" },
          recordedBy: { name: "Admin" },
        },
      ]);
      (prisma.expense.count as any).mockResolvedValue(1);
      (prisma.expenseCategory.findMany as any).mockResolvedValue([
        { id: "cat-1", name: "Electricity", code: "6000" },
      ]);

      const req = new Request(`http://localhost/api/v1/expenses?shopId=${shopId}`, {
        headers: { "x-test-user-id": userId },
      });

      const res = await getExpenses(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.expenses).toHaveLength(1);
      expect(data.data.categories).toHaveLength(1);
    });
  });

  describe("POST /api/v1/expenses", () => {
    it("should record an expense and post balanced entry", async () => {
      const categoryId = "11111111-2222-3333-4444-555555555555";
      (prisma.expenseCategory.findUnique as any).mockResolvedValue({
        id: categoryId,
        shopId,
        code: "6200",
        name: "Entertainment",
      });
      (prisma.account.findUnique as any).mockResolvedValue({
        id: "acc-6200",
        shopId,
        code: "6200",
      });
      (prisma.account.findMany as any).mockResolvedValue([
        { id: "acc-6200", code: "6200" },
        { id: "acc-1000", code: "1000" },
      ]);
      (prisma.expense.count as any).mockResolvedValue(0);
      (prisma.expense.create as any).mockImplementation(({ data }: any) =>
        Promise.resolve({ id: "exp-new", ...data })
      );
      (prisma.journalEntry.create as any).mockImplementation(({ data }: any) =>
        Promise.resolve({ id: "je-new", ...data })
      );

      const req = new Request("http://localhost/api/v1/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": userId,
        },
        body: JSON.stringify({
          shopId,
          categoryId,
          paymentMethod: "CASH",
          amount: 500,
          payee: "Guest snacks",
        }),
      });

      const res = await postExpense(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.data.expenseNumber).toBe("EXP-000001");
    });
  });

  describe("GET /api/v1/accounts/ledger", () => {
    it("should return chart of accounts and journal entries", async () => {
      (prisma.account.findMany as any).mockResolvedValue([
        { id: "acc-1", code: "1000", name: "Cash on Hand", type: "ASSET" },
      ]);
      (prisma.journalEntry.findMany as any).mockResolvedValue([
        { id: "je-1", description: "POS Sale", lines: [] },
      ]);
      (prisma.journalEntry.count as any).mockResolvedValue(1);

      const req = new Request(`http://localhost/api/v1/accounts/ledger?shopId=${shopId}`, {
        headers: { "x-test-user-id": userId },
      });

      const res = await getLedger(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.accounts).toHaveLength(1);
      expect(data.data.entries).toHaveLength(1);
    });
  });

  describe("GET /api/v1/accounts/trial-balance", () => {
    it("should return balanced trial balance report", async () => {
      (prisma.account.findMany as any).mockResolvedValue([
        {
          id: "acc-1000",
          code: "1000",
          name: "Cash",
          type: "ASSET",
          isActive: true,
          journalLines: [{ debit: new Prisma.Decimal(5000), credit: new Prisma.Decimal(0) }],
        },
        {
          id: "acc-3000",
          code: "3000",
          name: "Owner Capital",
          type: "EQUITY",
          isActive: true,
          journalLines: [{ debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(5000) }],
        },
      ]);

      const req = new Request(
        `http://localhost/api/v1/accounts/trial-balance?shopId=${shopId}`,
        {
          headers: { "x-test-user-id": userId },
        }
      );

      const res = await getTrialBalanceRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.totalDebits).toBe(5000);
      expect(data.data.totalCredits).toBe(5000);
      expect(data.data.isBalanced).toBe(true);
    });
  });

  describe("POST /api/v1/dues/collect", () => {
    it("should collect customer due and post to AR (1100)", async () => {
      const customerId = "22222222-3333-4444-5555-666666666666";
      (prisma.customer.findUnique as any).mockResolvedValue({
        id: customerId,
        shopId,
        name: "Customer A",
        totalDue: new Prisma.Decimal(3000),
      });
      (prisma.payment.count as any).mockResolvedValue(0);
      (prisma.payment.create as any).mockResolvedValue({ id: "pay-1" });
      (prisma.customer.update as any).mockResolvedValue({
        id: customerId,
        totalDue: new Prisma.Decimal(1000),
      });
      (prisma.account.findMany as any).mockResolvedValue([
        { id: "acc-1000", code: "1000" },
        { id: "acc-1100", code: "1100" },
      ]);
      (prisma.journalEntry.create as any).mockResolvedValue({ id: "je-1" });

      const req = new Request("http://localhost/api/v1/dues/collect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": userId,
        },
        body: JSON.stringify({
          shopId,
          customerId,
          amount: 2000,
          paymentMethod: "CASH",
        }),
      });

      const res = await collectDueRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.remainingDue).toBe(1000);
    });
  });
});
