import React from "react";
import { prisma } from "@/lib/db/prisma";
import { formatBDT, formatDhakaDate } from "@/lib/i18n";
import { Warehouse, ArrowUpRight, ArrowDownLeft, ShieldCheck, History, Sparkles, Box, DollarSign } from "lucide-react";

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

  const totalStockUnits = balances.reduce((sum, b) => sum + Number(b.quantityOnHand), 0);

  return (
    <div className="space-y-6">
      {/* Elevated Command Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-r from-card/90 via-card/60 to-card/90 p-6 sm:p-7 backdrop-blur-xl shadow-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 h-56 w-56 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 ring-2 ring-white/10 shrink-0">
              <Warehouse className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  ইনভেন্টরি ও স্টক মুভমেন্ট লেজার
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400">
                  <Sparkles className="w-3 h-3" />
                  Weighted Avg Cost
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                মজুদ পণ্যের ব্যালেন্স ও অপরিবর্তনীয় হিস্টোরিক্যাল স্টক মুভমেন্ট খতিয়ান
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Ledger Reconciled</span>
          </div>
        </div>
      </div>

      {/* Summary Valuation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-border/50 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/15 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              মোট ইনভেন্টরি মূল্যায়ন (Stock Value)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {formatBDT(totalStockValuation, "en")}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 font-medium">
            গড় ক্রয়মূল্য (Weighted Average Cost) ভিত্তিক বর্তমান মজুদ
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border/50 hover:border-teal-500/40 hover:shadow-xl hover:shadow-teal-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-teal-500/15 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              অন-হ্যান্ড মোট মজুদ
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500">
              <Box className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground font-mono">
            {totalStockUnits} টি
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 font-medium">
            দোকান ও ওয়্যারহাউজে মোট ফিজিক্যাল পণ্য একক
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border/50 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/15 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              রেকর্ডকৃত স্টক মুভমেন্ট
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-primary font-mono">
            {movements.length} টি
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 font-medium">
            সম্পূর্ণ অডিট ও ট্র্যাকিং হিস্ট্রি সম্বলিত রেকর্ড
          </div>
        </div>
      </div>

      {/* Stock Balances Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-emerald-500" />
            <span>মজুদ পণ্যের স্থিতি (Stock Balances)</span>
          </h2>
          <span className="text-xs text-muted-foreground font-medium">
            সর্বমোট {balances.length} টি পণ্যের স্টক
          </span>
        </div>

        <div className="glass-panel rounded-2xl border border-border/60 overflow-hidden shadow-xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/70 backdrop-blur-md border-b border-border/60 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">পণ্য</th>
                  <th className="px-4 py-3.5">লোকেশন</th>
                  <th className="px-4 py-3.5 text-right">মজুদ পরিমাণ</th>
                  <th className="px-4 py-3.5 text-right">গড় ক্রয় মূল্য</th>
                  <th className="px-4 py-3.5 text-right">মোট মান</th>
                  <th className="px-4 py-3.5 text-center">সর্বশেষ আপডেট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {balances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                      <Warehouse className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="font-bold text-base text-foreground">বর্তমানে স্টকে কোন পণ্য নেই</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        ক্রয় সম্পন্ন করে গুডস রিসিভ (GRN) করলে এখানে ইনভেন্টরি স্টক স্বয়ংক্রিয়ভাবে যোগ হবে।
                      </p>
                    </td>
                  </tr>
                ) : (
                  balances.map((b) => {
                    const qty = Number(b.quantityOnHand);
                    const avgCost = Number(b.averageCost);
                    return (
                      <tr key={b.id} className="hover:bg-emerald-500/5 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="font-bold text-foreground group-hover:text-emerald-500 transition-colors">
                            {b.product.name}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">
                            {b.product.sku}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs font-semibold text-muted-foreground">
                          <span className="px-2.5 py-1 rounded-lg bg-muted/60 border border-border/60 text-foreground">
                            {b.location.name}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right font-mono font-bold text-foreground">
                          {qty} টি
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-xs text-muted-foreground">
                          {formatBDT(avgCost, "en")}
                        </td>
                        <td className="px-4 py-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {formatBDT(qty * avgCost, "en")}
                        </td>
                        <td className="px-4 py-4 text-center text-xs text-muted-foreground font-medium">
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
          <History className="w-4 h-4 text-primary" />
          <h2 className="text-base font-bold text-foreground">
            স্টক মুভমেন্ট লেজার (Historical Movements)
          </h2>
        </div>

        <div className="glass-panel rounded-2xl border border-border/60 overflow-hidden shadow-xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/70 backdrop-blur-md border-b border-border/60 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">তারিখ ও সময়</th>
                  <th className="px-4 py-3.5">মুভমেন্টের ধরন</th>
                  <th className="px-4 py-3.5">পণ্য</th>
                  <th className="px-4 py-3.5 text-right">পরিমাণ (+ / -)</th>
                  <th className="px-4 py-3.5 text-right">একক খরচ</th>
                  <th className="px-4 py-3.5 text-right">ব্যালেন্স আফটার</th>
                  <th className="px-4 py-3.5">রেফারেন্স / কারণ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center text-muted-foreground">
                      <p className="font-medium">কোন স্টক মুভমেন্ট রেকর্ড পাওয়া যায়নি</p>
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const qty = Number(m.quantity);
                    const isPositive = qty > 0;
                    return (
                      <tr key={m.id} className="hover:bg-primary/5 transition-colors group">
                        <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap font-medium">
                          {formatDhakaDate(m.createdAt, "en", true)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              isPositive
                                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isPositive ? (
                              <ArrowDownLeft className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3 text-rose-500" />
                            )}
                            {m.movementType}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {m.product.name}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">
                            {m.product.sku}
                          </div>
                        </td>
                        <td
                          className={`px-4 py-4 text-right font-mono font-black ${
                            isPositive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isPositive ? `+${qty}` : qty}
                        </td>
                        <td className="px-4 py-4 text-right font-mono text-xs text-muted-foreground font-medium">
                          {formatBDT(Number(m.unitCost), "en")}
                        </td>
                        <td className="px-4 py-4 text-right font-mono font-bold text-foreground">
                          {Number(m.balanceAfter)}
                        </td>
                        <td className="px-4 py-4 text-xs text-muted-foreground font-medium">
                          <div>{m.reason || "—"}</div>
                          {m.referenceType && (
                            <div className="text-[10px] text-primary font-bold mt-0.5">Ref: {m.referenceType}</div>
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
