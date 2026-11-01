import React, { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import { PosTerminal } from "@/features/sales/pos-terminal";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export const dynamic = "force-dynamic";

export default function PosPage() {
  return (
    <Suspense
      fallback={
        <PageSkeleton
          title="POS কাউন্টার টার্মিনাল"
          badge="Live Billing"
          cardsCount={0}
          showFilters={false}
        />
      }
    >
      <PosDataLoader />
    </Suspense>
  );
}

async function PosDataLoader() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";
  const defaultCashierId = "00000000-0000-0000-0000-000000000001";

  // Parallel fetch location, products, and customers
  const [fetchedLocation, dbProducts, dbCustomers, fetchedActiveSession] = await Promise.all([
    prisma.location.findFirst({
      where: { shopId: defaultShopId },
    }),
    prisma.product.findMany({
      where: {
        shopId: defaultShopId,
        isActive: true,
      },
      include: {
        category: {
          select: { name: true },
        },
        stockBalances: {
          select: {
            quantityOnHand: true,
            locationId: true,
          },
        },
        serialNumbers: {
          where: { status: "IN_STOCK" },
          select: {
            id: true,
            imei1: true,
            imei2: true,
            status: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { shopId: defaultShopId },
      orderBy: { name: "asc" },
      take: 100,
    }),
    prisma.cashSession.findFirst({
      where: { shopId: defaultShopId, status: "OPEN" },
      include: {
        cashier: { select: { fullName: true } },
      },
      orderBy: { openingTime: "desc" },
    }),
  ]);

  let activeSession = fetchedActiveSession;
  if (!activeSession) {
    activeSession = await prisma.cashSession.create({
      data: {
        shopId: defaultShopId,
        cashierId: defaultCashierId,
        openingCash: 5000,
        status: "OPEN",
        notes: "কাউন্টার প্রারম্ভিক ক্যাশ সেশন",
      },
      include: {
        cashier: { select: { fullName: true } },
      },
    });
  }

  // Calculate live cash sales & cash expenses in this session
  const [cashSalesAgg, cashExpensesAgg] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        shopId: defaultShopId,
        paymentMethod: "CASH",
        allocations: {
          some: {
            sale: { cashSessionId: activeSession.id },
          },
        },
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        shopId: defaultShopId,
        paymentMethod: "CASH",
        expenseDate: { gte: activeSession.openingTime },
      },
      _sum: { amount: true },
    }),
  ]);

  const openingCash = Number(activeSession.openingCash || 0);
  const totalCashSales = Number(cashSalesAgg._sum?.amount || 0);
  const totalCashExpenses = Number(cashExpensesAgg._sum?.amount || 0);
  const currentCash = openingCash + totalCashSales - totalCashExpenses;

  const initialCashDrawer = {
    sessionId: activeSession.id,
    status: (activeSession.status as "OPEN" | "CLOSED"),
    cashierName: activeSession.cashier?.fullName || "প্রধান ক্যাশিয়ার",
    openingTime: activeSession.openingTime.toISOString(),
    openingCash,
    totalCashSales,
    totalCashExpenses,
    currentCash,
  };

  let location = fetchedLocation;
  if (!location) {
    location = await prisma.location.create({
      data: {
        shopId: defaultShopId,
        name: "Main Showroom",
        isDefault: true,
      },
    });
  }

  // Serialize Decimal types for client component
  const products = dbProducts.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    sku: p.sku,
    barcode: p.barcode,
    sellingPrice: Number(p.sellingPrice),
    category: { name: p.category.name },
    stockBalances: p.stockBalances.map((sb) => ({
      quantityOnHand: Number(sb.quantityOnHand),
      locationId: sb.locationId,
    })),
    serialNumbers: p.serialNumbers.map((s) => ({
      id: s.id,
      imei1: s.imei1,
      imei2: s.imei2,
      status: s.status,
    })),
  }));

  const customers = dbCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    totalDue: Number(c.totalDue),
  }));

  return (
    <div className="space-y-4">
      <PosTerminal
        shopId={defaultShopId}
        locationId={location.id}
        cashierId={defaultCashierId}
        products={products}
        customers={customers}
        initialCashDrawer={initialCashDrawer}
      />
    </div>
  );
}
