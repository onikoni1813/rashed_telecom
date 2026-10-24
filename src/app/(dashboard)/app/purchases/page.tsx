import React from "react";
import { prisma } from "@/lib/db/prisma";
import { formatBDT, formatDhakaDate } from "@/lib/i18n";
import { ShoppingBag, Plus, Truck, CheckCircle2, Clock } from "lucide-react";

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            <span>ক্রয় ও সাপ্লায়ার ব্যবস্থাপনা (Purchases & Orders)</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            পারচেজ অর্ডার, গুডস রিসিভ নোট (GRN), এবং সরবরাহকারী বিলিং
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-xs hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন পারচেজ অর্ডার</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border bg-card shadow-2xs space-y-1">
          <div className="text-xs font-medium text-muted-foreground">মোট পারচেজ অর্ডার</div>
          <div className="text-2xl font-bold text-foreground">{orders.length} টি</div>
          <div className="text-[11px] text-muted-foreground">তৈরিকৃত মোট ক্রয়াদেশ</div>
        </div>

        <div className="p-5 rounded-xl border bg-card shadow-2xs space-y-1">
          <div className="text-xs font-medium text-muted-foreground">নিবন্ধিত সরবরাহকারী (Suppliers)</div>
          <div className="text-2xl font-bold text-primary">{suppliers.length} জন</div>
          <div className="text-[11px] text-muted-foreground">ভেন্ডর ও ডিস্ট্রিবিউটর প্রোফাইল</div>
        </div>

        <div className="p-5 rounded-xl border bg-card shadow-2xs space-y-1">
          <div className="text-xs font-medium text-muted-foreground">সরবরাহকারীর মোট পাওনা (Payable)</div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatBDT(
              suppliers.reduce((sum, s) => sum + Number(s.payableBalance), 0),
              "en"
            )}
          </div>
          <div className="text-[11px] text-muted-foreground">গুডস রিসিভ অনুযায়ী বকেয়া বিল</div>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="rounded-xl border bg-card shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">PO নম্বর</th>
                <th className="px-4 py-3">সরবরাহকারী</th>
                <th className="px-4 py-3">অর্ডারকৃত পণ্যসমূহ</th>
                <th className="px-4 py-3 text-right">মোট মূল্য</th>
                <th className="px-4 py-3 text-center">স্ট্যাটাস</th>
                <th className="px-4 py-3 text-center">তারিখ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <Truck className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-medium">কোন পারচেজ অর্ডার পাওয়া যায়নি</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      সাপ্লায়ারের কাছে পণ্য অর্ডার করতে নতুন পারচেজ অর্ডার তৈরি করুন।
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((po) => {
                  const isReceived = po.status === "RECEIVED";
                  const isPartial = po.status === "PARTIALLY_RECEIVED";

                  return (
                    <tr key={po.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-primary">
                        {po.poNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{po.supplier.name}</div>
                        {po.supplier.phone && (
                          <div className="text-xs text-muted-foreground">{po.supplier.phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {po.items.map((it) => (
                            <div key={it.id} className="text-xs flex items-center gap-1.5">
                              <span className="font-medium text-foreground">{it.product.name}:</span>
                              <span className="text-muted-foreground">
                                {it.receivedQuantity} / {it.quantity} টি
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        {formatBDT(Number(po.totalAmount), "en")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isReceived
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : isPartial
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                          }`}
                        >
                          {isReceived ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {po.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground whitespace-nowrap">
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
