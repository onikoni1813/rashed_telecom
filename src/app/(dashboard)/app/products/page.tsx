import React from "react";
import { prisma } from "@/lib/db/prisma";
import { formatBDT } from "@/lib/i18n";
import { Package, Plus, Search, Tag, AlertTriangle, Layers, CheckCircle2, Sparkles, Box } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";

  const products = await prisma.product.findMany({
    where: { shopId: defaultShopId },
    include: {
      category: true,
      stockBalances: {
        include: { location: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const categories = await prisma.category.findMany({
    where: { shopId: defaultShopId },
    orderBy: { name: "asc" },
  });

  const stockTrackedCount = products.filter((p) => p.isTrackStock).length;
  const lowStockProducts = products.filter((p) => {
    const totalQty = p.stockBalances.reduce(
      (sum, b) => sum + Number(b.quantityOnHand),
      0
    );
    return p.isTrackStock && totalQty <= p.minStockAlert;
  });

  return (
    <div className="space-y-6">
      {/* Elevated Command Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-r from-card/90 via-card/60 to-card/90 p-6 sm:p-7 backdrop-blur-xl shadow-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 ring-2 ring-white/10 shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  পণ্য ক্যাটালগ ও প্রডাক্ট তালিকা
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 dark:text-indigo-400">
                  <Sparkles className="w-3 h-3" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                মোবাইল হ্যান্ডসেট, এক্সেসরিজ এবং রিপেয়ার পার্টস ইনভেন্টরি ক্যাটালগ
              </p>
            </div>
          </div>

          <button
            type="button"
            className="shimmer-button inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 hover:brightness-110 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন পণ্য যুক্ত করুন</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-border/50 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">মোট পণ্য (Total)</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Box className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">{products.length}</div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
            <span>সক্রিয় ক্যাটালগ আইটেম</span>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-border/50 hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">ক্যাটাগরি সমূহ</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">{categories.length}</div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
            <span>বিভক্ত ক্যাটাগরি গ্রুপ</span>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-border/50 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">স্টক ট্র্যাকড পণ্য</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {stockTrackedCount}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
            <span>রিয়েলটাইম ইনভেন্টরি ট্র্যাকিং</span>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-border/50 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">কম স্টক অ্যালার্ট</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-500">
            {lowStockProducts.length}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
            <span>পুনরায় অর্ডার প্রয়োজন</span>
          </div>
        </div>
      </div>

      {/* Search and Category Filter Bar */}
      <div className="glass-panel p-3.5 rounded-2xl border border-border/60 backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="পণ্য, মডেল, SKU, বা বারকোড দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-card/80 rounded-xl border border-border/70 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 transition-all font-medium"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="px-3 py-1.5 text-xs rounded-xl bg-indigo-600 text-white font-bold shadow-xs whitespace-nowrap">
            সকল পণ্য ({products.length})
          </span>
          {categories.map((c) => (
            <span
              key={c.id}
              className="px-3 py-1.5 text-xs rounded-xl border border-border/60 bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
            >
              <Tag className="w-3 h-3 text-indigo-400" />
              {c.name}
            </span>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="glass-panel rounded-2xl border border-border/60 overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/70 backdrop-blur-md border-b border-border/60 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              <tr>
                <th className="px-5 py-3.5">পণ্য ও ব্র্যান্ড</th>
                <th className="px-4 py-3.5">ক্যাটাগরি</th>
                <th className="px-4 py-3.5">SKU / বারকোড</th>
                <th className="px-4 py-3.5 text-right">ক্রয় মূল্য</th>
                <th className="px-4 py-3.5 text-right">বিক্রয় মূল্য</th>
                <th className="px-4 py-3.5 text-center">মজুদ (Stock)</th>
                <th className="px-4 py-3.5 text-center">স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="font-bold text-base text-foreground">কোন পণ্য পাওয়া যায়নি</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      ক্যাটালগ তৈরি করতে উপরের &apos;নতুন পণ্য যুক্ত করুন&apos; বাটনে ক্লিক করে পণ্য যোগ করুন।
                    </p>
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const stockTotal = product.stockBalances.reduce(
                    (sum, b) => sum + Number(b.quantityOnHand),
                    0
                  );
                  const isLow = product.isTrackStock && stockTotal <= product.minStockAlert;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-indigo-500/5 transition-colors group"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-foreground group-hover:text-indigo-500 transition-colors">
                          {product.name}
                        </div>
                        {product.brand && (
                          <div className="text-xs text-muted-foreground font-medium mt-0.5">
                            {product.brand}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted/60 border border-border/60 text-foreground">
                          {product.category.name}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs">
                        <div className="font-bold text-foreground">{product.sku}</div>
                        {product.barcode && (
                          <div className="text-muted-foreground text-[11px]">{product.barcode}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs text-muted-foreground">
                        {formatBDT(Number(product.costPrice), "en")}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-bold text-foreground">
                        {formatBDT(Number(product.sellingPrice), "en")}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {product.isTrackStock ? (
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              isLow
                                ? "bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-xs"
                                : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-xs"
                            }`}
                          >
                            {isLow ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            )}
                            {stockTotal} টি
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium">সার্ভিস/আনট্র্যাকড</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            product.isActive
                              ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {product.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}
                        </span>
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
