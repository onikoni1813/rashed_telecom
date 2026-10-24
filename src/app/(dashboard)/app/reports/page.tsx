import React from "react";
import {
  getProfitAndLoss,
  getCashbook,
  getReconciliationSummary,
} from "@/features/accounting/accounting-service";
import { ReportsView } from "@/features/accounting/reports-view";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
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
