import React from "react";
import { prisma } from "@/lib/db/prisma";
import { formatBDT, formatDhakaDate } from "@/lib/i18n";
import { ShoppingBag, Plus, Truck, CheckCircle2, Clock, Sparkles, Building2, CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";

  const orders = await prisma.purchaseOrder.findMany({
    where: { shopId: defaultShopId },
    include: {
      supplier: true,
      items: {
        include: { product: true },
      },
      goodsReceipts: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const suppliers = await prisma.supplier.findMany({
    where: { shopId: defaultShopId },
  });

  const totalPayable = suppliers.reduce((sum, s) => sum + Number(s.payableBalance), 0);

  return (
    <div className="space-y-6">
      {/* Elevated Command Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-r from-card/90 via-card/60 to-card/90 p-6 sm:p-7 backdrop-blur-xl shadow-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 ring-2 ring-white/10 shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  ক্রয় ও সাপ্লায়ার অর্ডার ব্যবস্থাপনা
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 border border-blue-500/30 text-blue-500 dark:text-blue-400">
                  <Sparkles className="w-3 h-3" />
                  GRN & Billing
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                পারচেজ অর্ডার, গুডস রিসিভ নোট (GRN), এবং সরবরাহকারী প্রদেয় বিলিং
              </p>
            </div>
          </div>

          <button
            type="button"
            className="shimmer-button inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-blue-500/25 hover:brightness-110 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন পারচেজ অর্ডার</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-border/50 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/15 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              মোট পারচেজ অর্ডার
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground font-mono">
            {orders.length} টি
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 font-medium">
            সাপ্লায়ারদের সাথে নিষ্পত্তিকৃত ক্রয়াদেশ
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border/50 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/15 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              নিবন্ধিত সরবরাহকারী (Suppliers)
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-primary font-mono">
            {suppliers.length} জন
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 font-medium">
            সক্রিয় ভেন্ডর ও ডিস্ট্রিবিউটর অ্যাকাউন্ট
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border/50 hover:border-rose-500/40 hover:shadow-xl hover:shadow-rose-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-500/15 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              সরবরাহকারীর প্রদেয় পাওনা (Payable)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {formatBDT(totalPayable, "en")}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 font-medium">
            গুডস রিসিভ (GRN) ও বিল অনুযায়ী দেনা
          </div>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="glass-panel rounded-2xl border border-border/60 overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/70 backdrop-blur-md border-b border-border/60 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              <tr>
                <th className="px-5 py-3.5">PO নম্বর</th>
                <th className="px-4 py-3.5">সরবরাহকারী</th>
                <th className="px-4 py-3.5">অর্ডারকৃত পণ্যসমূহ</th>
                <th className="px-4 py-3.5 text-right">মোট মূল্য</th>
                <th className="px-4 py-3.5 text-center">স্ট্যাটাস</th>
                <th className="px-4 py-3.5 text-center">তারিখ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                    <Truck className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="font-bold text-base text-foreground">কোন পারচেজ অর্ডার পাওয়া যায়নি</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      সাপ্লায়ারের কাছে পণ্য অর্ডার করতে উপরের &apos;নতুন পারচেজ অর্ডার&apos; বাটনে ক্লিক করুন।
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((po) => {
                  const isReceived = po.status === "RECEIVED";
                  const isPartial = po.status === "PARTIALLY_RECEIVED";

                  return (
                    <tr key={po.id} className="hover:bg-blue-500/5 transition-colors group">
                      <td className="px-5 py-4 font-mono font-bold text-primary group-hover:text-blue-500 transition-colors">
                        {po.poNumber}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-foreground">{po.supplier.name}</div>
                        {po.supplier.phone && (
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">{po.supplier.phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          {po.items.map((it) => (
                            <div key={it.id} className="text-xs flex items-center gap-1.5 font-medium">
                              <span className="text-foreground">{it.product.name}:</span>
                              <span className="text-muted-foreground font-mono">
                                {it.receivedQuantity} / {it.quantity} টি
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-bold text-base text-foreground">
                        {formatBDT(Number(po.totalAmount), "en")}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            isReceived
                              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                              : isPartial
                              ? "bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400"
                              : "bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {isReceived ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          {po.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-xs text-muted-foreground font-medium whitespace-nowrap">
                        {formatDhakaDate(po.orderedAt, "en", false)}
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
  );
}
