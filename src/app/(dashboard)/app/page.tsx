import React from "react";
import { prisma } from "@/lib/db/prisma";
import { DashboardView, DashboardMetricData } from "@/features/dashboard/dashboard-view";
import { getPerformanceAnalytics } from "@/features/dashboard/analytics-service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    shop,
    activeCashSession,
    salesTodayAgg,
    recentSales,
    serviceJobs,
    customersDueAgg,
    expensesTodayAgg,
    products,
    initialAnalytics,
  ] = await Promise.all([
    prisma.shop.findUnique({
      where: { id: defaultShopId },
      select: { name: true, currency: true, timezone: true },
    }),
    prisma.cashSession.findFirst({
      where: { shopId: defaultShopId, status: "OPEN" },
      include: { cashier: { select: { fullName: true } } },
    }),
    prisma.sale.aggregate({
      where: { shopId: defaultShopId, createdAt: { gte: todayStart } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.sale.findMany({
      where: { shopId: defaultShopId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        customer: { select: { name: true, phone: true } },
        items: { select: { id: true } },
      },
    }),
    prisma.serviceJob.findMany({
      where: {
        shopId: defaultShopId,
        status: {
          in: [
            "INTAKE",
            "DIAGNOSING",
            "ESTIMATE_PENDING",
            "ESTIMATE_APPROVED",
            "IN_REPAIR",
            "READY_FOR_DELIVERY",
            "WAITING_APPROVAL",
            "PARTS_PENDING",
            "REPAIRING",
            "TESTING",
            "READY",
          ],
        },
      },
      include: {
        customer: { select: { name: true, phone: true } },
        assignedTechnician: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.customer.aggregate({
      where: { shopId: defaultShopId, totalDue: { gt: 0 } },
      _sum: { totalDue: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { shopId: defaultShopId, expenseDate: { gte: todayStart } },
      _sum: { amount: true },
    }),
    prisma.product.findMany({
      where: { shopId: defaultShopId, isActive: true },
      include: {
        category: { select: { name: true } },
        stockBalances: { select: { quantityOnHand: true } },
      },
      take: 6,
    }),
    getPerformanceAnalytics({ shopId: defaultShopId, period: "today" }),
  ]);

  const todaySalesTotal = Number(salesTodayAgg._sum?.totalAmount || 0);
  const totalCustomerDues = Number(customersDueAgg._sum?.totalDue || 0);
  const todayExpenseTotal = Number(expensesTodayAgg._sum?.amount || 0);

  const metricData: DashboardMetricData = {
    shopName: shop?.name || "রাশেদ টেলিকম",
    currency: shop?.currency || "BDT",
    timezone: shop?.timezone || "Asia/Dhaka",
    activeCashSession: activeCashSession
      ? {
          status: activeCashSession.status,
          openingCash: Number(activeCashSession.openingCash),
          cashierName: activeCashSession.cashier.fullName || "Admin",
          openingTime: activeCashSession.openingTime.toISOString(),
        }
      : null,
    todaySalesTotal,
    todaySalesCount: salesTodayAgg._count || 0,
    activeRepairCount: serviceJobs.length,
    totalCustomerDues,
    dueCustomersCount: customersDueAgg._count || 0,
    todayExpenseTotal,
    activeServiceJobs: serviceJobs.map((j) => ({
      id: j.id,
      jobNumber: j.jobNumber,
      deviceBrand: j.deviceBrand,
      deviceModel: j.deviceModel,
      reportedIssue: j.reportedIssue || "মেরামত প্রয়োজন",
      status: j.status,
      customerName: j.customer?.name || "কাস্টমার",
      customerPhone: j.customer?.phone || "ফোন নেই",
      technicianName: j.assignedTechnician?.fullName || "টেকনিশিয়ান নির্ধারিত হয়নি",
      estimatedCost: Number(j.estimatedCost || 0),
      totalAmount: Number(j.totalAmount || 0),
      createdAt: j.createdAt.toISOString(),
    })),
    recentSales: recentSales.map((s) => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      customerName: s.customer?.name || "নগদ ক্রেতা",
      totalAmount: Number(s.totalAmount),
      paymentStatus: s.paymentStatus,
      itemCount: s.items.length,
      createdAt: s.createdAt.toISOString(),
    })),
    lowStockProducts: products.map((p) => {
      const totalQty = p.stockBalances.reduce((sum, sb) => sum + Number(sb.quantityOnHand), 0);
      return {
        id: p.id,
        name: p.name,
        categoryName: p.category.name,
        quantityOnHand: totalQty,
        minStockAlert: p.minStockAlert,
        sellingPrice: Number(p.sellingPrice),
      };
    }),
  };

  return (
    <DashboardView
      data={metricData}
      initialAnalytics={initialAnalytics}
      shopId={defaultShopId}
    />
  );
}
