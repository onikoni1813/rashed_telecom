"use client";

import React, { useState, useMemo } from "react";
import { formatBDT, formatDhakaDate } from "@/lib/i18n";
import {
  Warehouse,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  History,
  Sparkles,
  Box,
  DollarSign,
  Search,
  Plus,
  Minus,
  X,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  RefreshCw,
  Package,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { createStockAdjustmentAction } from "./inventory-actions";

export interface SerializedBalance {
  id: string;
  quantityOnHand: number;
  averageCost: number;
  updatedAt: string;
  location: {
    id: string;
    name: string;
  };
  product: {
    id: string;
    name: string;
    sku: string;
    costPrice: number;
    sellingPrice: number;
    category?: {
      name: string;
    } | null;
  };
}

export interface SerializedMovement {
  id: string;
  createdAt: string;
  movementType: string;
  quantity: number;
  unitCost: number;
  balanceAfter: number;
  reason: string | null;
  referenceType: string | null;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  location?: {
    name: string;
  } | null;
}

export interface SerializedShopLocation {
  id: string;
  name: string;
  isDefault: boolean;
}

interface InventoryViewProps {
  shopId: string;
  initialBalances: SerializedBalance[];
  initialMovements: SerializedMovement[];
  locations: SerializedShopLocation[];
}

export function InventoryView({
  shopId,
  initialBalances,
  initialMovements,
  locations,
}: InventoryViewProps) {
  const [balances, setBalances] = useState<SerializedBalance[]>(initialBalances);
  const [movements, setMovements] = useState<SerializedMovement[]>(initialMovements);

  // Filters
  const [search, setSearch] = useState("");
  const [movementFilter, setMovementFilter] = useState<string>("ALL");

  // Stock Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id || "");
  const [adjustmentDirection, setAdjustmentDirection] = useState<"OUT" | "IN">("OUT"); // OUT = deduction, IN = addition
  const [adjustQty, setAdjustQty] = useState<number | "">("");
  const [adjustReason, setAdjustReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // Open adjustment modal for specific product
  const handleOpenAdjustForProduct = (productId: string, locationId?: string) => {
    setSelectedProductId(productId);
    if (locationId) setSelectedLocationId(locationId);
    setIsAdjustModalOpen(true);
  };

  // Handle Adjustment Submit
  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      showNotification("পণ্য নির্বাচন করুন।", true);
      return;
    }
    if (!selectedLocationId) {
      showNotification("লোকেশন নির্বাচন করুন।", true);
      return;
    }
    const qtyVal = Number(adjustQty);
    if (!qtyVal || qtyVal <= 0) {
      showNotification("সঠিক পরিমাণ দিন (কমপক্ষে ১)।", true);
      return;
    }
    if (!adjustReason.trim()) {
      showNotification("স্টক সমন্বয়ের কারণ লিখুন।", true);
      return;
    }

    const finalQuantity = adjustmentDirection === "OUT" ? -qtyVal : qtyVal;
    setIsSubmitting(true);

    try {
      const res = await createStockAdjustmentAction({
        shopId,
        productId: selectedProductId,
        locationId: selectedLocationId,
        quantity: finalQuantity,
        reason: adjustReason.trim(),
      });

      if (!res.success || !res.movement) {
        showNotification(res.error || "স্টক সমন্বয় করতে সমস্যা হয়েছে।", true);
        return;
      }

      // 1. Prepend new movement to local state
      setMovements((prev) => [res.movement as SerializedMovement, ...prev]);

      // 2. Update local balance state
      setBalances((prev) => {
        return prev.map((b) => {
          if (b.product.id === selectedProductId && b.location.id === selectedLocationId) {
            return {
              ...b,
              quantityOnHand: res.updatedBalance.quantityOnHand,
              averageCost: res.updatedBalance.averageCost,
              updatedAt: new Date().toISOString(),
            };
          }
          return b;
        });
      });

      showNotification(`"${res.movement.product.name}" এর স্টক সফলভাবে সমন্বয় করা হয়েছে!`);

      // Reset modal form
      setAdjustQty("");
      setAdjustReason("");
      setIsAdjustModalOpen(false);
    } catch (err: any) {
      showNotification(err.message || "সমস্যা হয়েছে।", true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Balances
  const filteredBalances = useMemo(() => {
    if (!search.trim()) return balances;
    const q = search.toLowerCase().trim();
    return balances.filter((b) => {
      return (
        b.product.name.toLowerCase().includes(q) ||
        b.product.sku.toLowerCase().includes(q) ||
        b.location.name.toLowerCase().includes(q) ||
        b.product.category?.name.toLowerCase().includes(q)
      );
    });
  }, [balances, search]);

  // Filtered Movements
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      // Type filter
      if (movementFilter !== "ALL") {
        if (movementFilter === "SALE" && m.movementType !== "SALE") return false;
        if (
          movementFilter === "PURCHASE" &&
          m.movementType !== "PURCHASE_RECEIPT" &&
          m.movementType !== "OPENING_BALANCE"
        )
          return false;
        if (
          movementFilter === "ADJUSTMENT" &&
          !m.movementType.includes("ADJUSTMENT")
        )
          return false;
        if (
          movementFilter === "RETURN" &&
          !m.movementType.includes("RETURN")
        )
          return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesProd = m.product.name.toLowerCase().includes(q);
        const matchesSku = m.product.sku.toLowerCase().includes(q);
        const matchesReason = m.reason?.toLowerCase().includes(q) || false;
        const matchesRef = m.referenceType?.toLowerCase().includes(q) || false;

        return matchesProd || matchesSku || matchesReason || matchesRef;
      }

      return true;
    });
  }, [movements, movementFilter, search]);

  // Live KPI Calculations
  const totalStockValuation = balances.reduce(
    (sum, b) => sum + Number(b.quantityOnHand) * Number(b.averageCost),
    0
  );
  const totalStockUnits = balances.reduce((sum, b) => sum + Number(b.quantityOnHand), 0);

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {successMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-emerald-600 text-white shadow-2xl animate-in slide-in-from-top-4 duration-300 font-semibold text-sm border border-emerald-400/30">
          <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-2 hover:opacity-75 transition-opacity cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-rose-600 text-white shadow-2xl animate-in slide-in-from-top-4 duration-300 font-semibold text-sm border border-rose-400/30">
          <AlertCircle className="w-5 h-5 text-white shrink-0" />
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-2 hover:opacity-75 transition-opacity cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Ledger Reconciled</span>
            </div>

            {/* Manual Stock Adjustment Button */}
            <button
              type="button"
              onClick={() => {
                if (balances.length > 0 && !selectedProductId) {
                  setSelectedProductId(balances[0].product.id);
                }
                setIsAdjustModalOpen(true);
              }}
              className="flex-1 sm:flex-initial shimmer-button inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 hover:brightness-110 transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>স্টক সমন্বয় করুন</span>
            </button>
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

      {/* Live Search & Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-border/60 backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="পণ্য, SKU, গোডাউন, বা কারণ দিয়ে স্টক বা লেজার খুঁজুন..."
            className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-card/80 rounded-xl border border-border/70 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 transition-all font-medium"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Movement Type Filter Chips */}
        <div className="flex items-center gap-1.5 shrink-0 bg-muted/40 p-1 rounded-xl border border-border/50 text-xs overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setMovementFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              movementFilter === "ALL"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            সকল লেজার
          </button>
          <button
            type="button"
            onClick={() => setMovementFilter("SALE")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              movementFilter === "SALE"
                ? "bg-card text-rose-600 dark:text-rose-400 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            বিক্রয় (Sale)
          </button>
          <button
            type="button"
            onClick={() => setMovementFilter("PURCHASE")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              movementFilter === "PURCHASE"
                ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ক্রয়/স্টক-ইন
          </button>
          <button
            type="button"
            onClick={() => setMovementFilter("ADJUSTMENT")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              movementFilter === "ADJUSTMENT"
                ? "bg-card text-amber-600 dark:text-amber-400 shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            সমন্বয় (Adjustment)
          </button>
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
            ফিল্টারকৃত: {filteredBalances.length} টি পণ্য
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
                  <th className="px-4 py-3.5 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredBalances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                      <Warehouse className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="font-bold text-base text-foreground">কোন স্টক পাওয়া যায়নি</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        {search
                          ? "আপনার অনুসন্ধানের সাথে মিলে এমন কোনো স্টক ব্যালেন্স পাওয়া যায়নি।"
                          : "ক্রয় সম্পন্ন করে গুডস রিসিভ (GRN) করলে এখানে ইনভেন্টরি স্টক স্বয়ংক্রিয়ভাবে যোগ হবে।"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredBalances.map((b) => {
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
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              qty <= 0
                                ? "bg-rose-500/15 text-rose-500 border border-rose-500/25"
                                : qty <= 5
                                ? "bg-amber-500/15 text-amber-500 border border-amber-500/25"
                                : "text-foreground"
                            }`}
                          >
                            {qty} টি
                          </span>
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
                        <td className="px-4 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenAdjustForProduct(b.product.id, b.location.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30 transition-colors cursor-pointer"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>সমন্বয়</span>
                          </button>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              স্টক মুভমেন্ট লেজার (Historical Movements)
            </h2>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            ফিল্টারকৃত: {filteredMovements.length} টি রেকর্ড
          </span>
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
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center text-muted-foreground">
                      <p className="font-medium">কোন স্টক মুভমেন্ট রেকর্ড পাওয়া যায়নি</p>
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((m) => {
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
                          {Number(m.balanceAfter)} টি
                        </td>
                        <td className="px-4 py-4 text-xs text-muted-foreground font-medium">
                          <div>{m.reason || "—"}</div>
                          {m.referenceType && (
                            <div className="text-[10px] text-primary font-bold mt-0.5">
                              Ref: {m.referenceType}
                            </div>
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

      {/* ========================================================================= */}
      {/* MODAL: MANUAL STOCK ADJUSTMENT */}
      {/* ========================================================================= */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg glass-panel bg-card border border-border/80 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">স্টক সমন্বয় (Adjustment)</h3>
                  <p className="text-xs text-muted-foreground">
                    ঘাটতি, ভাঙচুর বা বাড়তি মালের স্টক অডিট সমন্বয়
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
              {/* Product Selector */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  পণ্য নির্বাচন করুন <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background text-sm font-medium focus:ring-2 focus:ring-emerald-500/30 focus:outline-hidden transition-all"
                >
                  <option value="" disabled>পণ্য নির্বাচন করুন</option>
                  {balances.map((b) => (
                    <option key={b.product.id} value={b.product.id}>
                      {b.product.name} (মজুদ: {b.quantityOnHand} টি) — {b.product.sku}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Selector */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  লোকেশন / গোডাউন <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background text-sm font-medium focus:ring-2 focus:ring-emerald-500/30 focus:outline-hidden transition-all"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.isDefault ? "(প্রধান দোকান)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Adjustment Direction (Decrease vs Increase) */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  সমন্বয়ের ধরন <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setAdjustmentDirection("OUT")}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      adjustmentDirection === "OUT"
                        ? "border-rose-500 bg-rose-500/10 font-bold text-rose-600 dark:text-rose-400 ring-1 ring-rose-500"
                        : "border-border/70 bg-card hover:bg-muted text-foreground"
                    }`}
                  >
                    <Minus className="w-4 h-4 text-rose-500" />
                    <div>
                      <div>স্টক হ্রাস (ঘাটতি)</div>
                      <div className="text-[10px] text-muted-foreground font-normal">ভাঙা/নষ্ট/হারানো</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustmentDirection("IN")}
                    className={`p-3 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      adjustmentDirection === "IN"
                        ? "border-emerald-500 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500"
                        : "border-border/70 bg-card hover:bg-muted text-foreground"
                    }`}
                  >
                    <Plus className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div>স্টক বৃদ্ধি (উদ্বৃত্ত)</div>
                      <div className="text-[10px] text-muted-foreground font-normal">গণনায় বাড়তি পাওয়া</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  পরিমাণ (টি) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="যেমন: ১ বা ৫"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background font-mono text-sm font-bold focus:ring-2 focus:ring-emerald-500/30 focus:outline-hidden transition-all"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  সমন্বয়ের কারণ / নোট <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="যেমন: ডিসপ্লে টেস্ট করার সময় ক্র্যাক হয়েছে, বা বার্ষিক গণনায় মিলকরণ"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/70 bg-background text-sm font-medium focus:ring-2 focus:ring-emerald-500/30 focus:outline-hidden transition-all"
                />
              </div>

              {/* Security Audit Warning */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  এই সমন্বয়টি তাৎক্ষণিকভাবে অডিট লগে সেভ হবে এবং স্টক মুভমেন্ট লেজারে স্থায়ীভাবে প্রদর্শিত হবে।
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-border text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="shimmer-button inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>সমন্বয় হচ্ছে...</span>
                  ) : (
                    <>
                      <SlidersHorizontal className="w-4 h-4" />
                      <span>সমন্বয় নিশ্চিত করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
