import React, { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import {
  getTrialBalance,
  getBalanceSheet,
} from "@/features/accounting/accounting-service";
import {
  AccountsView,
  SerializedAccount,
  SerializedJournalEntry,
} from "@/features/accounting/accounts-view";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export const dynamic = "force-dynamic";

async function AccountsDataLoader() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";

  // Fetch Accounts and Journal Entries
  const [rawAccounts, rawEntries, trialBalance, balanceSheet] = await Promise.all([
    prisma.account.findMany({
      where: { shopId: defaultShopId, isActive: true },
      include: {
        journalLines: true,
      },
      orderBy: { code: "asc" },
    }),
    prisma.journalEntry.findMany({
      where: { shopId: defaultShopId },
      include: {
        lines: {
          include: { account: true },
        },
      },
      orderBy: { entryDate: "desc" },
      take: 100,
    }),
    getTrialBalance(defaultShopId),
    getBalanceSheet(defaultShopId),
  ]);

  const accounts: SerializedAccount[] = rawAccounts.map((acc) => {
    let debits = 0;
    let credits = 0;
    for (const l of acc.journalLines) {
      debits += Number(l.debit);
      credits += Number(l.credit);
    }
    const netBalance =
      acc.type === "ASSET" || acc.type === "EXPENSE"
        ? debits - credits
        : credits - debits;

    return {
      id: acc.id,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      totalDebit: debits,
      totalCredit: credits,
      netBalance,
    };
  });

  const journalEntries: SerializedJournalEntry[] = rawEntries.map((e) => ({
    id: e.id,
    entryDate: e.entryDate.toISOString(),
    sourceType: e.sourceType,
    sourceId: e.sourceId,
    description: e.description || "",
    isReversed: Boolean(e.description && e.description.startsWith("[REVERSED]")),
    lines: e.lines.map((l) => ({
      id: l.id,
      accountCode: l.account.code,
      accountName: l.account.name,
      accountType: l.account.type,
      debit: Number(l.debit),
      credit: Number(l.credit),
      description: l.description,
    })),
  }));

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <AccountsView
        shopId={defaultShopId}
        accounts={accounts}
        journalEntries={journalEntries}
        trialBalance={trialBalance}
        balanceSheet={balanceSheet}
      />
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense
      fallback={
        <PageSkeleton
          title="অ্যাকাউন্টিং ও খতিয়ান"
          subtitle="হিসাব তালিকা, জার্নাল এন্ট্রি ও ব্যালেন্স শীট লোড হচ্ছে..."
          cardsCount={4}
          showFilter={true}
          rowsCount={6}
        />
      }
    >
      <AccountsDataLoader />
    </Suspense>
  );
}
