import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculatePeriodRange,
  getPerformanceAnalytics,
} from "@/features/dashboard/analytics-service";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    sale: {
      findMany: vi.fn(),
    },
    serviceJob: {
      findMany: vi.fn(),
    },
    expense: {
      findMany: vi.fn(),
    },
    payment: {
      findMany: vi.fn(),
    },
  },
}));

describe("Performance Analytics Service", () => {
  const shopId = "11111111-1111-1111-1111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("calculatePeriodRange", () => {
    it("should calculate range for today", () => {
      const range = calculatePeriodRange("today");
      expect(range.label).toContain("আজকের");
      expect(range.start.getHours()).toBe(0);
      expect(range.start.getMinutes()).toBe(0);
    });

    it("should calculate range for week", () => {
      const range = calculatePeriodRange("week");
      expect(range.label).toContain("সপ্তাহ");
      expect(range.start.getTime()).toBeLessThan(range.end.getTime());
    });

    it("should calculate range for month", () => {
      const range = calculatePeriodRange("month");
      expect(range.label).toContain("মাস");
      expect(range.start.getDate()).toBe(1);
    });

    it("should calculate range for year", () => {
      const range = calculatePeriodRange("year");
      expect(range.label).toContain("বছর");
      expect(range.start.getMonth()).toBe(0);
      expect(range.start.getDate()).toBe(1);
    });

    it("should calculate range for custom dates", () => {
      const range = calculatePeriodRange("custom", "2026-01-01", "2026-01-15");
      expect(range.label).toContain("কাস্টম");
      expect(range.start.getFullYear()).toBe(2026);
    });
  });

  describe("getPerformanceAnalytics Calculations", () => {
    it("should compute sales, service, expense, and net profit correctly", async () => {
      // Mock Sales: 1 sale with 2 items
      vi.mocked(prisma.sale.findMany).mockResolvedValue([
        {
          id: "sale-1",
          shopId,
          totalAmount: 25000,
          discount: 500,
          paidAmount: 25000,
          dueAmount: 0,
          createdAt: new Date("2026-10-25T10:00:00Z"),
          items: [
            {
              id: "item-1",
              productId: "prod-1",
              quantity: 2,
              unitPrice: 10000,
              unitCost: 8000,
              subtotal: 20000,
              product: {
                id: "prod-1",
                name: "Smartphone X",
                category: { name: "Smartphones" },
              },
            },
            {
              id: "item-2",
              productId: "prod-2",
              quantity: 1,
              unitPrice: 5500,
              unitCost: 4000,
              subtotal: 5500,
              product: {
                id: "prod-2",
                name: "Charger",
                category: { name: "Accessories" },
              },
            },
          ],
        },
      ] as any);

      // Mock Service: 1 completed job with 1 part
      vi.mocked(prisma.serviceJob.findMany).mockResolvedValue([
        {
          id: "job-1",
          shopId,
          jobNumber: "JOB-001",
          status: "DELIVERED",
          totalAmount: 3000,
          labourCost: 1000,
          partsCost: 1500,
          outsideCost: 200,
          createdAt: new Date("2026-10-25T11:00:00Z"),
          parts: [
            {
              id: "part-1",
              productId: "prod-display",
              quantity: 1,
              unitCost: 1500,
              sellingPrice: 2000,
              product: { name: "Display" },
            },
          ],
        },
      ] as any);

      // Mock Expense: 2 expenses
      vi.mocked(prisma.expense.findMany).mockResolvedValue([
        {
          id: "exp-1",
          shopId,
          amount: 500,
          expenseDate: new Date("2026-10-25T12:00:00Z"),
          category: { name: "চা ও আপ্যায়ন" },
        },
        {
          id: "exp-2",
          shopId,
          amount: 1500,
          expenseDate: new Date("2026-10-25T13:00:00Z"),
          category: { name: "বিদ্যুৎ বিল" },
        },
      ] as any);

      // Mock Payments
      vi.mocked(prisma.payment.findMany).mockResolvedValue([
        { paymentMethod: "BKASH", amount: 25000 },
        { paymentMethod: "CASH", amount: 3000 },
      ] as any);

      const result = await getPerformanceAnalytics({ shopId, period: "today" });

      // Sales Assertions
      expect(result.sales.totalRevenue).toBe(25000);
      expect(result.sales.totalQuantitySold).toBe(3); // 2 + 1
      expect(result.sales.totalInvoices).toBe(1);
      // COGS = (2*8000) + (1*4000) = 20000
      expect(result.sales.totalCOGS).toBe(20000);
      // Gross Profit = 25000 - 20000 = 5000
      expect(result.sales.grossProfit).toBe(5000);
      expect(result.sales.profitMarginPercent).toBe(20);

      // Service Assertions
      expect(result.service.totalRevenue).toBe(3000);
      expect(result.service.deliveredJobsCount).toBe(1);
      // Service Net Profit = 3000 - 1500 - 200 = 1300
      expect(result.service.netProfit).toBe(1300);

      // Expense Assertions
      expect(result.expenses.totalAmount).toBe(2000); // 500 + 1500
      expect(result.expenses.totalCount).toBe(2);
      expect(result.expenses.categoryBreakdown).toHaveLength(2);

      // Bottom Line Net Profit
      // Total Gross = 5000 (sales) + 1300 (service) = 6300
      // Net Profit = 6300 - 2000 (expenses) = 4300
      expect(result.bottomLine.netBusinessProfit).toBe(4300);
      expect(result.bottomLine.isProfitable).toBe(true);

      // Top Products
      expect(result.topProducts).toHaveLength(2);
      expect(result.topProducts[0].productName).toBe("Smartphone X");
    });
  });
});
