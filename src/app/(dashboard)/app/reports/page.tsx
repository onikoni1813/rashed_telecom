import React, { Suspense } from "react";
import {
  getProfitAndLoss,
  getCashbook,
  getReconciliationSummary,
} from "@/features/accounting/accounting-service";
import { ReportsView } from "@/features/accounting/reports-view";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export const dynamic = "force-dynamic";

async function ReportsDataLoader() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";

  const [pnl, cashbook, reconciliation] = await Promise.all([
    getProfitAndLoss(defaultShopId),
    getCashbook(defaultShopId, 50),
    getReconciliationSummary(defaultShopId),
  ]);

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <ReportsView pnl={pnl} cashbook={cashbook} reconciliation={reconciliation} />
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <PageSkeleton
          title="রিপোর্টস ও স্টেটমেন্ট"
          subtitle="লাভ-ক্ষতি, ক্যাশবুক এবং সমন্বয় রিপোর্ট লোড হচ্ছে..."
          cardsCount={3}
          showFilter={true}
          rowsCount={6}
        />
      }
    >
      <ReportsDataLoader />
    </Suspense>
  );
}
