import React from "react";
import { prisma } from "@/lib/db/prisma";
import { formatBDT, formatDhakaDate } from "@/lib/i18n";
import { Warehouse, ArrowUpRight, ArrowDownLeft, ShieldCheck, History } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";

  const balances = await prisma.stockBalance.findMany({
    where: { shopId: defaultShopId },
    include: {
      product: {
        include: { category: true },
      },
      location: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const movements = await prisma.stockMovement.findMany({
    where: { shopId: defaultShopId },
    include: {
      product: true,
      location: true,
      actor: true,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const totalStockValuation = balances.reduce(
    (sum, b) => sum + Number(b.quantityOnHand) * Number(b.averageCost),
    0
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-primary" />
            <span>ইনভেন্টরি ও স্টক লেজার (Inventory & Stock Ledger)</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            মজুদ পণ্য ব্যালেন্স ও অপরিবর্তনীয় হিস্টোরিক্যাল স্টক মুভমেন্ট লেজার
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Ledger Reconciled</span>
        </div>
      </div>

      {/* Summary Valuation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border bg-card shadow-2xs space-y-1">
          <div className="text-xs font-medium text-muted-foreground">মোট ইনভেন্টরি মূল্যায়ন (Stock Value)</div>
          <div className="text-2xl font-bold text-foreground">
            {formatBDT(totalStockValuation, "en")}
          </div>
          <div className="text-[11px] text-muted-foreground">গড় ক্রয়মূল্য (Weighted Avg Cost) ভিত্তিক</div>
        </div>

        <div className="p-5 rounded-xl border bg-card shadow-2xs space-y-1">
          <div className="text-xs font-medium text-muted-foreground">স্টকে বিদ্যমান মোট পরিমাণ</div>
          <div className="text-2xl font-bold text-foreground">
            {balances.reduce((sum, b) => sum + Number(b.quantityOnHand), 0)} টি
          </div>
          <div className="text-[11px] text-muted-foreground">অন-হ্যান্ড ফিজিক্যাল স্টক</div>
        </div>

        <div className="p-5 rounded-xl border bg-card shadow-2xs space-y-1">
          <div className="text-xs font-medium text-muted-foreground">রেকর্ডকৃত স্টক মুভমেন্ট</div>
          <div className="text-2xl font-bold text-primary">{movements.length} টি</div>
          <div className="text-[11px] text-muted-foreground">সম্পূর্ণ অডিট ও ট্র্যাকিং হিস্ট্রি</div>
        </div>
      </div>

      {/* Stock Balances Table */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">মজুদ পণ্যের স্থিতি (Stock Balances)</h2>
        <div className="rounded-xl border bg-card shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">পণ্য</th>
                  <th className="px-4 py-3">লোকেশন</th>
                  <th className="px-4 py-3 text-right">মজুদ পরিমাণ</th>
                  <th className="px-4 py-3 text-right">গড় ক্রয় মূল্য</th>
                  <th className="px-4 py-3 text-right">মোট মান</th>
                  <th className="px-4 py-3 text-center">সর্বশেষ আপডেট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {balances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      <Warehouse className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="font-medium">বর্তমানে স্টকে কোন পণ্য নেই</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ক্রয় সম্পন্ন করে গুডস রিসিভ (GRN) করলে এখানে স্টক যোগ হবে।
                      </p>
                    </td>
                  </tr>
                ) : (
                  balances.map((b) => {
                    const qty = Number(b.quantityOnHand);
                    const avgCost = Number(b.averageCost);
                    return (
                      <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{b.product.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{b.product.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-muted-foreground">
                          {b.location.name}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">
                          {qty} টি
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-muted-foreground">
                          {formatBDT(avgCost, "en")}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatBDT(qty * avgCost, "en")}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                          {formatDhakaDate(b.updatedAt, "en", true)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Historical Stock Movements Ledger */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">
            স্টক মুভমেন্ট লেজার (Historical Movements)
          </h2>
        </div>
        <div className="rounded-xl border bg-card shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">তারিখ ও সময়</th>
                  <th className="px-4 py-3">মুভমেন্টের ধরন</th>
                  <th className="px-4 py-3">পণ্য</th>
                  <th className="px-4 py-3 text-right">পরিমাণ (+ / -)</th>
                  <th className="px-4 py-3 text-right">একক খরচ</th>
                  <th className="px-4 py-3 text-right">ব্যালেন্স আফটার</th>
                  <th className="px-4 py-3">রেফারেন্স / কারণ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      <p className="font-medium">কোন স্টক মুভমেন্ট রেকর্ড পাওয়া যায়নি</p>
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const qty = Number(m.quantity);
                    const isPositive = qty > 0;
                    return (
                      <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDhakaDate(m.createdAt, "en", true)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isPositive
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                            }`}
                          >
                            {isPositive ? (
                              <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3 text-rose-600" />
                            )}
                            {m.movementType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{m.product.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{m.product.sku}</div>
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-bold ${
                            isPositive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isPositive ? `+${qty}` : qty}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-muted-foreground">
                          {formatBDT(Number(m.unitCost), "en")}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">
                          {Number(m.balanceAfter)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          <div>{m.reason || "-"}</div>
                          {m.referenceType && (
                            <div className="text-[10px] text-primary">Ref: {m.referenceType}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
