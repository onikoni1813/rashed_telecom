import React, { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import { ExpensesView, SerializedExpense, SerializedExpenseCategory } from "@/features/accounting/expenses-view";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export const dynamic = "force-dynamic";

export default function ExpensesPage() {
  return (
    <Suspense
      fallback={
        <PageSkeleton
          title="দোকান খরচ খাতা"
          badge="Daily Expenses"
          cardsCount={4}
          showFilters={true}
        />
      }
    >
      <ExpensesDataLoader />
    </Suspense>
  );
}

async function ExpensesDataLoader() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";

  // Fetch all expenses and categories for the shop
  const [rawExpenses, rawCategories] = await Promise.all([
    prisma.expense.findMany({
      where: { shopId: defaultShopId },
      include: {
        category: true,
        account: true,
        recordedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { expenseDate: "desc" },
      take: 100,
    }),
    prisma.expenseCategory.findMany({
      where: { shopId: defaultShopId },
      orderBy: { name: "asc" },
    }),
  ]);

  const expenses: SerializedExpense[] = rawExpenses.map((e) => ({
    id: e.id,
    expenseNumber: e.expenseNumber,
    expenseDate: e.expenseDate.toISOString(),
    categoryName: e.category.name,
    categoryCode: e.category.code || "6200",
    amount: Number(e.amount),
    paymentMethod: e.paymentMethod,
    payee: e.payee,
    receiptRef: e.receiptRef,
    notes: e.notes,
    recordedByName: e.recordedBy.fullName || e.recordedBy.email || "কর্মচারী",
  }));

  const categories: SerializedExpenseCategory[] = rawCategories.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code || "6200",
  }));

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <ExpensesView
        shopId={defaultShopId}
        expenses={expenses}
        categories={categories}
      />
    </div>
  );
}
