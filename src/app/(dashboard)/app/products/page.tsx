import React from "react";
import { prisma } from "@/lib/db/prisma";
import { formatBDT } from "@/lib/i18n";
import { Package, Plus, Search, Tag, AlertTriangle } from "lucide-react";

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            <span>পণ্য তালিকা (Product Catalogue)</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            মোবাইল হ্যান্ডসেট, এক্সেসরিজ এবং রিপেয়ার পার্টস ব্যবস্থাপনা
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-xs hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন পণ্য যুক্ত করুন</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-card shadow-2xs">
          <div className="text-xs text-muted-foreground">মোট পণ্য (Total Products)</div>
          <div className="text-xl font-bold mt-1">{products.length}</div>
        </div>
        <div className="p-4 rounded-xl border bg-card shadow-2xs">
          <div className="text-xs text-muted-foreground">ক্যাটাগরি (Categories)</div>
          <div className="text-xl font-bold mt-1">{categories.length}</div>
        </div>
        <div className="p-4 rounded-xl border bg-card shadow-2xs">
          <div className="text-xs text-muted-foreground">স্টক ট্র্যাকড পণ্য</div>
          <div className="text-xl font-bold mt-1 text-emerald-600">
            {products.filter((p) => p.isTrackStock).length}
          </div>
        </div>
        <div className="p-4 rounded-xl border bg-card shadow-2xs">
          <div className="text-xs text-muted-foreground">কম স্টক অ্যালার্ট</div>
          <div className="text-xl font-bold mt-1 text-amber-500">
            {
              products.filter((p) => {
                const totalQty = p.stockBalances.reduce(
                  (sum, b) => sum + Number(b.quantityOnHand),
                  0
                );
                return p.isTrackStock && totalQty <= p.minStockAlert;
              }).length
            }
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex items-center gap-3 bg-card p-3 rounded-xl border shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="নাম, SKU, বা বারকোড দিয়ে খুঁজুন..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-background rounded-lg border border-input focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {categories.map((c) => (
            <span
              key={c.id}
              className="px-2.5 py-1 text-xs rounded-full border bg-muted/50 text-foreground font-medium flex items-center gap-1"
            >
              <Tag className="w-3 h-3 text-muted-foreground" />
              {c.name}
            </span>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border bg-card shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">পণ্য ও ব্র্যান্ড</th>
                <th className="px-4 py-3">ক্যাটাগরি</th>
                <th className="px-4 py-3">SKU / বারকোড</th>
                <th className="px-4 py-3 text-right">ক্রয় মূল্য</th>
                <th className="px-4 py-3 text-right">বিক্রয় মূল্য</th>
                <th className="px-4 py-3 text-center">মজুদ (Stock)</th>
                <th className="px-4 py-3 text-center">স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Package className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-medium">কোন পণ্য পাওয়া যায়নি</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      উপরের &apos;নতুন পণ্য যুক্ত করুন&apos; বাটনে ক্লিক করে প্রথম পণ্য যুক্ত করুন।
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
                    <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{product.name}</div>
                        {product.brand && (
                          <div className="text-xs text-muted-foreground">{product.brand}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted border">
                          {product.category.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <div>{product.sku}</div>
                        {product.barcode && (
                          <div className="text-muted-foreground">{product.barcode}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-muted-foreground">
                        {formatBDT(Number(product.costPrice), "en")}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        {formatBDT(Number(product.sellingPrice), "en")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {product.isTrackStock ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isLow
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            }`}
                          >
                            {isLow && <AlertTriangle className="w-3 h-3" />}
                            {stockTotal} টি
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">সার্ভিস/আনট্র্যাকড</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            product.isActive
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
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
