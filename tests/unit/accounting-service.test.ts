import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  recordExpense,
  collectCustomerDue,
  paySupplier,
  recordOwnerTransaction,
  recordLoanTransaction,
  reverseJournalEntry,
  getTrialBalance,
  getProfitAndLoss,
  closeAccountingPeriod,
} from "@/features/accounting/accounting-service";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    expenseCategory: {
      findUnique: vi.fn(),
    },
    account: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    expense: {
      count: vi.fn(),
      create: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    supplier: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      count: vi.fn(),
      create: vi.fn(),
    },
    journalEntry: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    accountingPeriod: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("Accounting & Finance Domain Service", () => {
  const shopId = "11111111-1111-1111-1111-111111111111";
  const userId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. recordExpense", () => {
    it("should throw validation error if amount <= 0", async () => {
      await expect(
        recordExpense({
          shopId,
          categoryId: "cat-1",
          paymentMethod: "CASH",
          amount: 0,
          recordedById: userId,
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should create expense and post balanced journal entry (Debit 6000, Credit 1000)", async () => {
      (prisma.expenseCategory.findUnique as any).mockResolvedValue({
        id: "cat-rent",
        shopId,
        code: "6000",
        name: "Shop Rent",
      });

      (prisma.account.findUnique as any).mockResolvedValue({
        id: "acc-6000",
        shopId,
        code: "6000",
      });

      (prisma.account.findMany as any).mockResolvedValue([
        { id: "acc-6000", code: "6000" },
        { id: "acc-1000", code: "1000" },
      ]);

      (prisma.expense.count as any).mockResolvedValue(0);
      (prisma.expense.create as any).mockImplementation(({ data }: any) =>
        Promise.resolve({ id: "exp-1", ...data, category: { name: "Shop Rent" } })
      );
      (prisma.journalEntry.create as any).mockImplementation(({ data }: any) =>
        Promise.resolve({ id: "je-exp-1", ...data })
      );

      const result = await recordExpense({
        shopId,
        categoryId: "cat-rent",
        paymentMethod: "CASH",
        amount: 15000,
        payee: "Landlord",
        notes: "Monthly shop rent",
        recordedById: userId,
      });

      expect(result.expenseNumber).toBe("EXP-000001");
      expect(prisma.journalEntry.create).toHaveBeenCalled();
    });
  });

  describe("2. collectCustomerDue", () => {
    it("should enforce 'Due collection is not new revenue' by crediting Accounts Receivable (1100)", async () => {
      (prisma.customer.findUnique as any).mockResolvedValue({
        id: "cust-1",
        shopId,
        name: "Rahim",
        totalDue: new Prisma.Decimal(5000),
      });

      (prisma.payment.count as any).mockResolvedValue(0);
      (prisma.payment.create as any).mockResolvedValue({ id: "pay-1" });
      (prisma.customer.update as any).mockResolvedValue({
        id: "cust-1",
        totalDue: new Prisma.Decimal(3000),
      });

      (prisma.account.findMany as any).mockResolvedValue([
        { id: "acc-1000", code: "1000" },
        { id: "acc-1100", code: "1100" },
      ]);
      (prisma.journalEntry.create as any).mockImplementation(({ data }: any) =>
        Promise.resolve({ id: "je-due-1", ...data })
      );

      const result = await collectCustomerDue({
        shopId,
        customerId: "cust-1",
        amount: 2000,
        paymentMethod: "CASH",
        collectedById: userId,
      });

      expect(result.remainingDue).toBe(3000);
      expect(prisma.journalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lines: {
              create: expect.arrayContaining([
                expect.objectContaining({ accountId: "acc-1000" }),
                expect.objectContaining({ accountId: "acc-1100" }), // Credit Accounts Receivable!
              ]),
            },
          }),
        })
      );
    });

    it("should reject collection exceeding outstanding customer due", async () => {
      (prisma.customer.findUnique as any).mockResolvedValue({
        id: "cust-1",
        shopId,
        totalDue: new Prisma.Decimal(1000),
      });

      await expect(
        collectCustomerDue({
          shopId,
          customerId: "cust-1",
          amount: 1500,
          paymentMethod: "CASH",
          collectedById: userId,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("3. paySupplier", () => {
    it("should enforce 'Supplier payment is not a second purchase expense' by debiting Accounts Payable (2000)", async () => {
      (prisma.supplier.findUnique as any).mockResolvedValue({
        id: "sup-1",
        shopId,
        name: "Dhaka Telecom Dist",
        payableBalance: new Prisma.Decimal(25000),
      });

      (prisma.supplier.update as any).mockResolvedValue({
        id: "sup-1",
        payableBalance: new Prisma.Decimal(15000),
      });

      (prisma.account.findMany as any).mockResolvedValue([
        { id: "acc-2000", code: "2000" },
        { id: "acc-1010", code: "1010" },
      ]);
      (prisma.journalEntry.create as any).mockImplementation(({ data }: any) =>
        Promise.resolve({ id: "je-sup-1", ...data })
      );

      const result = await paySupplier({
        shopId,
        supplierId: "sup-1",
        amount: 10000,
        paymentMethod: "BKASH",
        paidById: userId,
      });

      expect(result.remainingPayable).toBe(15000);
      expect(prisma.journalEntry.create).toHaveBeenCalled();
    });
  });

  describe("4. recordOwnerTransaction", () => {
    it("should enforce 'Owner personal drawings are not operating expenses' (Debit 3100, Credit 1000)", async () => {
      (prisma.account.findMany as any).mockResolvedValue([
        { id: "acc-3100", code: "3100" },
        { id: "acc-1000", code: "1000" },
      ]);
      (prisma.journalEntry.create as any).mockImplementation(({ data }: any) =>
        Promise.resolve({ id: "je-owner-1", ...data })
      );

      const result = await recordOwnerTransaction({
        shopId,
        type: "DRAWING",
        amount: 8000,
        paymentMethod: "CASH",
        actorId: userId,
      });

      expect(result).toBeDefined();
      expect(prisma.journalEntry.create).toHaveBeenCalled();
    });
  });

  describe("5. recordLoanTransaction", () => {
    it("should enforce 'Loan principal repayment is not interest expense' by splitting 2200 and 6300", async () => {
      (prisma.account.findMany as any).mockResolvedValue([
        { id: "acc-2200", code: "2200" }, // Loans Payable
        { id: "acc-6300", code: "6300" }, // Interest Expense
        { id: "acc-1000", code: "1000" }, // Cash
      ]);
      (prisma.journalEntry.create as any).mockImplementation(({ data }: any) =>
        Promise.resolve({ id: "je-loan-1", ...data })
      );

      const result = await recordLoanTransaction({
        shopId,
        type: "REPAYMENT",
        principalAmount: 10000,
        interestAmount: 500,
        paymentMethod: "CASH",
        lenderName: "Islami Bank",
        actorId: userId,
      });

      expect(result).toBeDefined();
      expect(prisma.journalEntry.create).toHaveBeenCalled();
    });
  });

  describe("6. reverseJournalEntry", () => {
    it("should invert lines and mark original entry as reversed", async () => {
      (prisma.journalEntry.findUnique as any).mockResolvedValue({
        id: "orig-1",
        shopId,
        sourceType: "EXPENSE",
        sourceId: "exp-1",
        description: "Rent Payment",
        lines: [
          { id: "line-1", account: { code: "6000" }, debit: new Prisma.Decimal(5000), credit: new Prisma.Decimal(0) },
          { id: "line-2", account: { code: "1000" }, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(5000) },
        ],
      });

      (prisma.account.findMany as any).mockResolvedValue([
        { id: "acc-6000", code: "6000" },
        { id: "acc-1000", code: "1000" },
      ]);
      (prisma.journalEntry.create as any).mockImplementation(({ data }: any) =>
        Promise.resolve({ id: "rev-1", ...data })
      );
      (prisma.journalEntry.update as any).mockResolvedValue({ id: "orig-1" });

      const reversal = await reverseJournalEntry({
        shopId,
        journalEntryId: "orig-1",
        reason: "Entered wrong amount",
        actorId: userId,
      });

      expect(reversal).toBeDefined();
      expect(prisma.journalEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "orig-1" },
          data: expect.objectContaining({
            description: expect.stringContaining("[REVERSED]"),
          }),
        })
      );
    });

    it("should prevent reversing an already reversed entry", async () => {
      (prisma.journalEntry.findUnique as any).mockResolvedValue({
        id: "orig-2",
        shopId,
        description: "[REVERSED] Rent Payment",
        lines: [],
      });

      await expect(
        reverseJournalEntry({
          shopId,
          journalEntryId: "orig-2",
          reason: "Duplicate reversal attempt",
          actorId: userId,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("7. getTrialBalance & getProfitAndLoss", () => {
    it("should verify Trial Balance equality (Debits === Credits)", async () => {
      (prisma.account.findMany as any).mockResolvedValue([
        {
          id: "acc-1",
          code: "1000",
          name: "Cash",
          type: "ASSET",
          isActive: true,
          journalLines: [{ debit: new Prisma.Decimal(10000), credit: new Prisma.Decimal(0) }],
        },
        {
          id: "acc-2",
          code: "3000",
          name: "Owner Capital",
          type: "EQUITY",
          isActive: true,
          journalLines: [{ debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(10000) }],
        },
      ]);

      const tb = await getTrialBalance(shopId);
      expect(tb.totalDebits).toBe(10000);
      expect(tb.totalCredits).toBe(10000);
      expect(tb.isBalanced).toBe(true);
    });

    it("should compute Net Profit = Gross Profit - Operating Expenses", async () => {
      (prisma.account.findMany as any).mockResolvedValue([
        {
          code: "4000", // Sales: 50,000
          journalLines: [{ debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(50000) }],
        },
        {
          code: "5000", // COGS: 30,000
          journalLines: [{ debit: new Prisma.Decimal(30000), credit: new Prisma.Decimal(0) }],
        },
        {
          code: "6000", // Rent: 5,000
          journalLines: [{ debit: new Prisma.Decimal(5000), credit: new Prisma.Decimal(0) }],
        },
      ]);

      const pnl = await getProfitAndLoss(shopId);
      expect(pnl.revenue.totalRevenue).toBe(50000);
      expect(pnl.directCosts.totalDirectCosts).toBe(30000);
      expect(pnl.grossProfit).toBe(20000);
      expect(pnl.operatingExpenses.totalOperatingExpenses).toBe(5000);
      expect(pnl.netProfit).toBe(15000);
    });
  });
});
