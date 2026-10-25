import { prisma } from "@/lib/db/prisma";

export type AnalyticsPeriod = "today" | "week" | "month" | "year" | "custom";

export interface PerformanceAnalyticsFilter {
  shopId: string;
  period?: AnalyticsPeriod;
  startDate?: string | Date;
  endDate?: string | Date;
}

export interface ExpenseCategoryBreakdown {
  categoryName: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface TopProductPerformance {
  productId: string;
  productName: string;
  categoryName: string;
  quantitySold: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  marginPercent: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  methodLabel: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface DailyTrendPoint {
  dateKey: string;
  displayDate: string;
  salesRevenue: number;
  salesProfit: number;
  serviceRevenue: number;
  serviceProfit: number;
  expenseAmount: number;
  netProfit: number;
}

export interface PerformanceAnalyticsResult {
  period: AnalyticsPeriod;
  periodLabel: string;
  startDate: string;
  endDate: string;

  // 1. Sales & Product Profit
  sales: {
    totalRevenue: number;
    totalQuantitySold: number;
    totalInvoices: number;
    totalCOGS: number;
    grossProfit: number;
    profitMarginPercent: number;
    totalDiscount: number;
    totalPaid: number;
    totalDue: number;
  };

  // 2. Servicing & Service Profit
  service: {
    totalRevenue: number;
    totalJobsCount: number;
    deliveredJobsCount: number;
    totalLabourCost: number;
    totalPartsCost: number;
    totalOutsideCost: number;
    netProfit: number;
    profitMarginPercent: number;
    totalPartsUsed: number;
  };

  // 3. Operating Expenses
  expenses: {
    totalAmount: number;
    totalCount: number;
    categoryBreakdown: ExpenseCategoryBreakdown[];
  };

  // 4. Overall Business Bottom-line (Net Profit)
  bottomLine: {
    totalBusinessRevenue: number;
    totalBusinessGrossProfit: number;
    totalBusinessExpenses: number;
    netBusinessProfit: number;
    netMarginPercent: number;
    isProfitable: boolean;
  };

  // 5. Payment Methods Split
  paymentBreakdown: PaymentMethodBreakdown[];

  // 6. Top-Selling Products
  topProducts: TopProductPerformance[];

  // 7. Trend Data
  dailyTrend: DailyTrendPoint[];
}

/**
 * Calculates start and end timestamps based on period & timezone
 */
export function calculatePeriodRange(
  period: AnalyticsPeriod,
  customStart?: string | Date,
  customEnd?: string | Date
): { start: Date; end: Date; label: string } {
  const now = new Date();

  if (period === "custom" && customStart) {
    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    const end = customEnd ? new Date(customEnd) : new Date();
    end.setHours(23, 59, 59, 999);
    return {
      start,
      end,
      label: `কাস্টম (${start.toLocaleDateString("bn-BD")} - ${end.toLocaleDateString("bn-BD")})`,
    };
  }

  const start = new Date(now);

  if (period === "today") {
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: "আজকের হিসাব (Today)" };
  }

  if (period === "week") {
    // Last 7 days
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: "এই সপ্তাহের হিসাব (Last 7 Days)" };
  }

  if (period === "month") {
    // Current calendar month from 1st
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: "চলতি মাসের হিসাব (This Month)" };
  }

  if (period === "year") {
    // Current calendar year from Jan 1st
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: "বাৎসরিক হিসাব (This Year)" };
  }

  // Default fallback to today
  start.setHours(0, 0, 0, 0);
  return { start, end: now, label: "আজকের হিসাব" };
}

/**
 * Core Database Aggregation Engine for Performance & Profit Analytics
 */
export async function getPerformanceAnalytics(
  filter: PerformanceAnalyticsFilter
): Promise<PerformanceAnalyticsResult> {
  const shopId = filter.shopId;
  const period = filter.period || "today";
  const { start, end, label } = calculatePeriodRange(period, filter.startDate, filter.endDate);

  // 1. Fetch Sales and SaleItems in parallel with Service Jobs and Expenses
  const [sales, serviceJobs, expenses, payments] = await Promise.all([
    prisma.sale.findMany({
      where: {
        shopId,
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),

    prisma.serviceJob.findMany({
      where: {
        shopId,
        createdAt: { gte: start, lte: end },
      },
      include: {
        parts: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),

    prisma.expense.findMany({
      where: {
        shopId,
        expenseDate: { gte: start, lte: end },
      },
      include: {
        category: { select: { name: true } },
      },
      orderBy: { expenseDate: "asc" },
    }),

    prisma.payment.findMany({
      where: {
        shopId,
        createdAt: { gte: start, lte: end },
      },
      select: {
        paymentMethod: true,
        amount: true,
      },
    }),
  ]);

  // =========================================================================
  // 1. COMPUTE SALES & PRODUCT PROFIT
  // =========================================================================
  let totalSalesRevenue = 0;
  let totalQuantitySold = 0;
  let totalSalesCOGS = 0;
  let totalDiscount = 0;
  let totalPaid = 0;
  let totalDue = 0;

  // Track product level performance for top products
  const productAggMap = new Map<
    string,
    {
      productId: string;
      productName: string;
      categoryName: string;
      quantity: number;
      revenue: number;
      cost: number;
    }
  >();

  // Date map for trend
  const trendMap = new Map<
    string,
    {
      dateKey: string;
      displayDate: string;
      salesRevenue: number;
      salesProfit: number;
      serviceRevenue: number;
      serviceProfit: number;
      expenseAmount: number;
    }
  >();

  const getOrInitTrend = (d: Date) => {
    const key = d.toISOString().split("T")[0];
    if (!trendMap.has(key)) {
      trendMap.set(key, {
        dateKey: key,
        displayDate: d.toLocaleDateString("bn-BD", { month: "short", day: "numeric" }),
        salesRevenue: 0,
        salesProfit: 0,
        serviceRevenue: 0,
        serviceProfit: 0,
        expenseAmount: 0,
      });
    }
    return trendMap.get(key)!;
  };

  for (const sale of sales) {
    const saleRevenue = Number(sale.totalAmount);
    const saleDiscount = Number(sale.discount || 0);
    const salePaid = Number(sale.paidAmount || 0);
    const saleDue = Number(sale.dueAmount || 0);

    totalSalesRevenue += saleRevenue;
    totalDiscount += saleDiscount;
    totalPaid += salePaid;
    totalDue += saleDue;

    let saleCOGS = 0;
    for (const item of sale.items) {
      const qty = item.quantity;
      const unitCost = Number(item.unitCost || 0);
      const subtotal = Number(item.subtotal || 0);
      const itemCost = qty * unitCost;

      totalQuantitySold += qty;
      saleCOGS += itemCost;
      totalSalesCOGS += itemCost;

      // Product level aggregation
      const pId = item.productId;
      if (!productAggMap.has(pId)) {
        productAggMap.set(pId, {
          productId: pId,
          productName: item.product.name,
          categoryName: item.product.category?.name || "সাধারণ",
          quantity: 0,
          revenue: 0,
          cost: 0,
        });
      }
      const pAgg = productAggMap.get(pId)!;
      pAgg.quantity += qty;
      pAgg.revenue += subtotal;
      pAgg.cost += itemCost;
    }

    const itemGrossProfit = saleRevenue - saleCOGS;
    const trend = getOrInitTrend(sale.createdAt);
    trend.salesRevenue += saleRevenue;
    trend.salesProfit += itemGrossProfit;
  }

  // Net gross sales profit after accounting for invoice discounts
  const grossSalesProfit = totalSalesRevenue - totalSalesCOGS;
  const salesProfitMarginPercent =
    totalSalesRevenue > 0
      ? Math.round((grossSalesProfit / totalSalesRevenue) * 1000) / 10
      : 0;

  // =========================================================================
  // 2. COMPUTE SERVICING & SERVICE PROFIT
  // =========================================================================
  let totalServiceRevenue = 0;
  let deliveredJobsCount = 0;
  let totalLabourCost = 0;
  let totalPartsCost = 0;
  let totalOutsideCost = 0;
  let totalPartsUsedCount = 0;

  for (const job of serviceJobs) {
    const jobRevenue = Number(job.totalAmount || 0);
    const labour = Number(job.labourCost || 0);
    const outside = Number(job.outsideCost || 0);

    let jobPartsCost = 0;
    for (const part of job.parts) {
      const partQty = part.quantity;
      const partUnitCost = Number(part.unitCost || 0);
      jobPartsCost += partQty * partUnitCost;
      totalPartsUsedCount += partQty;
    }

    // If job recorded partsCost directly, use the higher/exact value
    const finalJobPartsCost = Math.max(Number(job.partsCost || 0), jobPartsCost);

    totalServiceRevenue += jobRevenue;
    totalLabourCost += labour;
    totalPartsCost += finalJobPartsCost;
    totalOutsideCost += outside;

    if (job.status === "DELIVERED" || job.status === "READY") {
      deliveredJobsCount += 1;
    }

    const jobNetProfit = jobRevenue - finalJobPartsCost - outside;
    const trend = getOrInitTrend(job.createdAt);
    trend.serviceRevenue += jobRevenue;
    trend.serviceProfit += jobNetProfit;
  }

  const serviceNetProfit = totalServiceRevenue - totalPartsCost - totalOutsideCost;
  const serviceMarginPercent =
    totalServiceRevenue > 0
      ? Math.round((serviceNetProfit / totalServiceRevenue) * 1000) / 10
      : 0;

  // =========================================================================
  // 3. COMPUTE OPERATING EXPENSES & BREAKDOWN
  // =========================================================================
  let totalExpenses = 0;
  const expenseCatMap = new Map<string, { amount: number; count: number }>();

  for (const exp of expenses) {
    const amount = Number(exp.amount || 0);
    totalExpenses += amount;

    const catName = exp.category?.name || "অন্যান্য খরচ";
    if (!expenseCatMap.has(catName)) {
      expenseCatMap.set(catName, { amount: 0, count: 0 });
    }
    const catAgg = expenseCatMap.get(catName)!;
    catAgg.amount += amount;
    catAgg.count += 1;

    const trend = getOrInitTrend(exp.expenseDate);
    trend.expenseAmount += amount;
  }

  const categoryBreakdown: ExpenseCategoryBreakdown[] = Array.from(expenseCatMap.entries())
    .map(([catName, val]) => ({
      categoryName: catName,
      amount: val.amount,
      percentage: totalExpenses > 0 ? Math.round((val.amount / totalExpenses) * 1000) / 10 : 0,
      count: val.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  // =========================================================================
  // 4. OVERALL BUSINESS BOTTOM-LINE (NET PROFIT)
  // =========================================================================
  const totalBusinessRevenue = totalSalesRevenue + totalServiceRevenue;
  const totalBusinessGrossProfit = grossSalesProfit + serviceNetProfit;
  const netBusinessProfit = totalBusinessGrossProfit - totalExpenses;
  const netMarginPercent =
    totalBusinessRevenue > 0
      ? Math.round((netBusinessProfit / totalBusinessRevenue) * 1000) / 10
      : 0;
  const isProfitable = netBusinessProfit >= 0;

  // =========================================================================
  // 5. PAYMENT METHODS SPLIT
  // =========================================================================
  const methodLabelMap: Record<string, string> = {
    CASH: "ক্যাশ / নগদ টাকা",
    BKASH: "বিকাশ (bKash)",
    NAGAD: "নগদ (Nagad)",
    ROCKET: "রকেট (Rocket)",
    BANK: "ব্যাংক অ্যাকাউন্ট / কার্ড",
  };

  const paymentAggMap = new Map<string, { amount: number; count: number }>();
  let totalPaymentSum = 0;

  for (const pay of payments) {
    const amt = Number(pay.amount || 0);
    totalPaymentSum += amt;
    const m = pay.paymentMethod || "CASH";
    if (!paymentAggMap.has(m)) {
      paymentAggMap.set(m, { amount: 0, count: 0 });
    }
    const cur = paymentAggMap.get(m)!;
    cur.amount += amt;
    cur.count += 1;
  }

  // If no separate payment records exist yet, fallback to sales cash distribution
  if (totalPaymentSum === 0 && totalSalesRevenue > 0) {
    paymentAggMap.set("CASH", { amount: totalPaid, count: sales.length });
    totalPaymentSum = totalPaid;
  }

  const paymentBreakdown: PaymentMethodBreakdown[] = Array.from(paymentAggMap.entries()).map(
    ([method, data]) => ({
      method,
      methodLabel: methodLabelMap[method] || method,
      amount: data.amount,
      count: data.count,
      percentage: totalPaymentSum > 0 ? Math.round((data.amount / totalPaymentSum) * 1000) / 10 : 0,
    })
  );

  // =========================================================================
  // 6. TOP 5 SELLING PRODUCTS BY PROFIT & QUANTITY
  // =========================================================================
  const topProducts: TopProductPerformance[] = Array.from(productAggMap.values())
    .map((p) => {
      const profit = p.revenue - p.cost;
      return {
        productId: p.productId,
        productName: p.productName,
        categoryName: p.categoryName,
        quantitySold: p.quantity,
        totalRevenue: p.revenue,
        totalCost: p.cost,
        totalProfit: profit,
        marginPercent: p.revenue > 0 ? Math.round((profit / p.revenue) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.totalProfit - a.totalProfit)
    .slice(0, 5);

  // =========================================================================
  // 7. DAILY TREND
  // =========================================================================
  const dailyTrend: DailyTrendPoint[] = Array.from(trendMap.values())
    .map((t) => ({
      ...t,
      netProfit: t.salesProfit + t.serviceProfit - t.expenseAmount,
    }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  return {
    period,
    periodLabel: label,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    sales: {
      totalRevenue: totalSalesRevenue,
      totalQuantitySold,
      totalInvoices: sales.length,
      totalCOGS: totalSalesCOGS,
      grossProfit: grossSalesProfit,
      profitMarginPercent: salesProfitMarginPercent,
      totalDiscount,
      totalPaid,
      totalDue,
    },
    service: {
      totalRevenue: totalServiceRevenue,
      totalJobsCount: serviceJobs.length,
      deliveredJobsCount,
      totalLabourCost,
      totalPartsCost,
      totalOutsideCost,
      netProfit: serviceNetProfit,
      profitMarginPercent: serviceMarginPercent,
      totalPartsUsed: totalPartsUsedCount,
    },
    expenses: {
      totalAmount: totalExpenses,
      totalCount: expenses.length,
      categoryBreakdown,
    },
    bottomLine: {
      totalBusinessRevenue,
      totalBusinessGrossProfit,
      totalBusinessExpenses: totalExpenses,
      netBusinessProfit,
      netMarginPercent,
      isProfitable,
    },
    paymentBreakdown,
    topProducts,
    dailyTrend,
  };
}
