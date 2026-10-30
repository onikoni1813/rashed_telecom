"use client";

import React, { useState } from "react";
import { formatBDT, formatDateTimeDhaka } from "@/lib/i18n";
import {
  Receipt,
  Search,
  Eye,
  Printer,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Calendar,
  User,
} from "lucide-react";
import { CashMemo } from "./cash-memo";

export interface SaleSummaryItem {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string | null;
  customerId: string | null;
  itemCount: number;
  subtotal: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    serials: string[];
  }>;
}

interface SalesListViewProps {
  sales: SaleSummaryItem[];
  shopId: string;
  locationId: string;
}

export function SalesListView({ sales, shopId, locationId }: SalesListViewProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedSale, setSelectedSale] = useState<SaleSummaryItem | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnItemId, setReturnItemId] = useState<string>("");
  const [returnQuantity, setReturnQuantity] = useState<number>(1);
  const [returnMethod, setReturnMethod] = useState<"CASH" | "BANK" | "ADJUST_DUE">("CASH");
  const [returnReason, setReturnReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const nowDhakaStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());

  const getDhakaDateString = (dateInput: string | Date) => {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date(dateInput));
  };

  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "YESTERDAY" | "THIS_WEEK" | "THIS_MONTH" | "CUSTOM">("TODAY");
  const [customDate, setCustomDate] = useState<string>(nowDhakaStr);
  const [viewMode, setViewMode] = useState<"INVOICES" | "PRODUCTS">("INVOICES");

  const filteredSales = sales.filter((s) => {
    const saleDateStr = getDhakaDateString(s.createdAt);

    let matchesDate = true;
    if (dateFilter === "TODAY") {
      matchesDate = saleDateStr === nowDhakaStr;
    } else if (dateFilter === "YESTERDAY") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(yesterday);
      matchesDate = saleDateStr === yesterdayStr;
    } else if (dateFilter === "THIS_WEEK") {
      const diffTime = new Date().getTime() - new Date(s.createdAt).getTime();
      matchesDate = diffTime >= 0 && diffTime <= 7 * 24 * 60 * 60 * 1000;
    } else if (dateFilter === "THIS_MONTH") {
      matchesDate = saleDateStr.slice(0, 7) === nowDhakaStr.slice(0, 7);
    } else if (dateFilter === "CUSTOM") {
      matchesDate = saleDateStr === customDate;
    }

    const matchesSearch =
      search === "" ||
      s.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (s.customerPhone && s.customerPhone.includes(search)) ||
      s.items.some((it) => it.productName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || s.paymentStatus === statusFilter;

    return matchesDate && matchesSearch && matchesStatus;
  });

  // Calculate Product-Wise Aggregation
  const productSummaryMap = new Map<
    string,
    {
      productName: string;
      totalQuantity: number;
      totalRevenue: number;
      unitPrice: number;
      allSerials: string[];
      invoices: Array<{ invoiceNumber: string; quantity: number; sale: SaleSummaryItem }>;
    }
  >();

  for (const s of filteredSales) {
    for (const item of s.items) {
      const existing = productSummaryMap.get(item.productName);
      if (existing) {
        existing.totalQuantity += item.quantity;
        existing.totalRevenue += item.subtotal;
        if (item.serials && item.serials.length > 0) {
          existing.allSerials.push(...item.serials);
        }
        existing.invoices.push({ invoiceNumber: s.invoiceNumber, quantity: item.quantity, sale: s });
      } else {
        productSummaryMap.set(item.productName, {
          productName: item.productName,
          totalQuantity: item.quantity,
          totalRevenue: item.subtotal,
          unitPrice: item.unitPrice,
          allSerials: item.serials ? [...item.serials] : [],
          invoices: [{ invoiceNumber: s.invoiceNumber, quantity: item.quantity, sale: s }],
        });
      }
    }
  }

  const soldProductsList = Array.from(productSummaryMap.values()).sort(
    (a, b) => b.totalQuantity - a.totalQuantity
  );

  const totalItemsSold = soldProductsList.reduce((sum, p) => sum + p.totalQuantity, 0);
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalPaid = filteredSales.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalDue = filteredSales.reduce((sum, s) => sum + s.dueAmount, 0);

  // Counts for pills
  const todayCount = sales.filter((s) => getDhakaDateString(s.createdAt) === nowDhakaStr).length;

  const handlePrint = () => {
    window.print();
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || !returnItemId) return;

    setLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/v1/sales/${selectedSale.id}/returns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `ret-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        },
        body: JSON.stringify({
          shopId,
          locationId,
          refundMethod: returnMethod,
          returnReason,
          items: [
            {
              saleItemId: returnItemId,
              quantity: returnQuantity,
              condition: "GOOD",
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "পণ্য ফেরত সম্পন্ন করা যায়নি।");
      }

      setActionSuccess(`রিটার্ন সম্পন্ন হয়েছে! রিটার্ন নং: ${data.data.returnNumber}`);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setActionError(err.message || "ত্রুটি ঘটেছে");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls & Table wrapped in print:hidden so only CashMemo prints */}
      <div className="sales-table-workspace print:hidden space-y-6">
        
        {/* Date Filter Pills & Custom Date Picker */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-card border border-border shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>সময়সীমা:</span>
            </span>

            <button
              type="button"
              onClick={() => setDateFilter("TODAY")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                dateFilter === "TODAY"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <span>আজকে</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${dateFilter === "TODAY" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                {todayCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDateFilter("YESTERDAY")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilter === "YESTERDAY"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              গতকাল
            </button>

            <button
              type="button"
              onClick={() => setDateFilter("THIS_WEEK")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilter === "THIS_WEEK"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              গত ৭ দিন
            </button>

            <button
              type="button"
              onClick={() => setDateFilter("THIS_MONTH")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilter === "THIS_MONTH"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              এই মাস
            </button>

            <button
              type="button"
              onClick={() => setDateFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateFilter === "ALL"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              সকল বিক্রয় ({sales.length})
            </button>
          </div>

          {/* Custom Date Input */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">তারিখ নির্বাচন:</span>
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setDateFilter("CUSTOM");
              }}
              className="px-2.5 py-1.5 text-xs rounded-xl border bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Dynamic Period Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3.5 sm:p-4 rounded-2xl border bg-card/80 shadow-2xs">
            <div className="text-[11px] sm:text-xs text-muted-foreground font-medium">বিক্রিত মোট পণ্য</div>
            <div className="text-lg sm:text-xl font-black mt-1 text-foreground flex items-baseline gap-1">
              <span>{totalItemsSold}</span>
              <span className="text-xs font-normal text-muted-foreground">টি</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl border bg-card/80 shadow-2xs">
            <div className="text-[11px] sm:text-xs text-muted-foreground font-medium">মোট বিক্রয় মূল্য</div>
            <div className="text-lg sm:text-xl font-black mt-1 text-foreground">
              {formatBDT(totalRevenue)}
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl border bg-card/80 shadow-2xs">
            <div className="text-[11px] sm:text-xs text-muted-foreground font-medium">আদায়কৃত অর্থ</div>
            <div className="text-lg sm:text-xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
              {formatBDT(totalPaid)}
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl border bg-card/80 shadow-2xs">
            <div className="text-[11px] sm:text-xs text-muted-foreground font-medium">বকেয়া পরিমাণ</div>
            <div className="text-lg sm:text-xl font-black mt-1 text-rose-600 dark:text-rose-400">
              {formatBDT(totalDue)}
            </div>
          </div>
        </div>

        {/* View Mode Tabs (Invoices vs Sold Products) & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Tabs */}
          <div className="inline-flex p-1 rounded-2xl bg-muted/70 border border-border text-xs">
            <button
              type="button"
              onClick={() => setViewMode("INVOICES")}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                viewMode === "INVOICES"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Receipt className="w-4 h-4 text-primary" />
              <span>চালান / মেমো তালিকা ({filteredSales.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("PRODUCTS")}
              className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                viewMode === "PRODUCTS"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>বিক্রিত পণ্যের তালিকা ({soldProductsList.length} টি আইটেম)</span>
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="পণ্য, চালান বা গ্রাহক সার্চ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {viewMode === "INVOICES" && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="ALL">সকল স্ট্যাটাস</option>
                <option value="PAID">পরিশোধিত (PAID)</option>
                <option value="PARTIALLY_PAID">আংশিক বকেয়া</option>
                <option value="DUE">বকেয়া (DUE)</option>
              </select>
            )}
          </div>
        </div>

        {/* TAB 1: INVOICES VIEW */}
        {viewMode === "INVOICES" && (
          <div className="border rounded-2xl bg-card shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3.5">চালান নং (Invoice)</th>
                    <th className="px-4 py-3.5">তারিখ ও সময়</th>
                    <th className="px-4 py-3.5">গ্রাহক (Customer)</th>
                    <th className="px-4 py-3.5 text-center">আইটেম সংখ্যা</th>
                    <th className="px-4 py-3.5 text-right">মোট মূল্য</th>
                    <th className="px-4 py-3.5 text-right">পরিশোধিত</th>
                    <th className="px-4 py-3.5 text-right">বকেয়া</th>
                    <th className="px-4 py-3.5 text-center">স্ট্যাটাস</th>
                    <th className="px-4 py-3.5 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                        <div className="max-w-xs mx-auto space-y-2">
                          <Receipt className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                          <p className="font-semibold text-foreground text-sm">কোনো বিক্রয়ের রেকর্ড পাওয়া যায়নি</p>
                          <p className="text-xs text-muted-foreground">নির্বাচিত সময়সীমা বা সার্চের জন্য কোনো চালান মেলেনি।</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-semibold text-primary">
                          {sale.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {formatDateTimeDhaka(new Date(sale.createdAt))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{sale.customerName}</div>
                          {sale.customerPhone && (
                            <div className="text-xs text-muted-foreground">{sale.customerPhone}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">
                          {sale.itemCount}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">
                          {formatBDT(sale.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                          {formatBDT(sale.paidAmount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {sale.dueAmount > 0 ? (
                            <span className="text-rose-600 font-semibold">{formatBDT(sale.dueAmount)}</span>
                          ) : (
                            <span className="text-muted-foreground">৳ 0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              sale.paymentStatus === "PAID"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : sale.paymentStatus === "PARTIALLY_PAID"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {sale.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSale(sale);
                              if (sale.items.length > 0) {
                                setReturnItemId(sale.items[0].id);
                              }
                              setShowReturnModal(false);
                            }}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-primary font-bold inline-flex items-center gap-1 text-xs transition-colors"
                            title="রশিদ দেখুন"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>রশিদ</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCT-WISE SALES BREAKDOWN */}
        {viewMode === "PRODUCTS" && (
          <div className="border rounded-2xl bg-card shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">ক্র.</th>
                    <th className="px-4 py-3.5">পণ্যের নাম ও বিবরণ</th>
                    <th className="px-4 py-3.5 text-center">বিক্রিত পরিমাণ</th>
                    <th className="px-4 py-3.5 text-right">গড় একক দর</th>
                    <th className="px-4 py-3.5 text-right">মোট বিক্রয় মূল্য</th>
                    <th className="px-4 py-3.5">বিক্রিত চালানসমূহ (Invoices)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {soldProductsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        <div className="max-w-xs mx-auto space-y-2">
                          <Smartphone className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                          <p className="font-semibold text-foreground text-sm">কোনো পণ্য বিক্রয়ের রেকর্ড মেলেনি</p>
                          <p className="text-xs text-muted-foreground">এই সময়সীমায় কোনো পণ্য বিক্রয় হয়নি।</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    soldProductsList.map((prod, idx) => (
                      <tr key={idx} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-center text-muted-foreground font-mono text-xs">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-foreground text-sm">{prod.productName}</div>
                          {prod.allSerials.length > 0 && (
                            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                              IMEI: {prod.allSerials.join(", ")}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-primary/10 text-primary border border-primary/20">
                            {prod.totalQuantity} টি
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                          {formatBDT(prod.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-black text-foreground">
                          {formatBDT(prod.totalRevenue)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {prod.invoices.map((inv, invIdx) => (
                              <button
                                key={invIdx}
                                type="button"
                                onClick={() => {
                                  setSelectedSale(inv.sale);
                                  setShowReturnModal(false);
                                }}
                                className="px-2 py-0.5 rounded-md bg-muted hover:bg-primary hover:text-primary-foreground font-mono text-[11px] font-semibold text-foreground transition-all"
                                title="চালানটি দেখতে ক্লিক করুন"
                              >
                                {inv.invoiceNumber} ({inv.quantity} টি)
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {/* END sales-table-workspace print:hidden */}

      {/* Receipt View Modal (Unified Cash Memo) */}
      {selectedSale && !showReturnModal && (
        <CashMemo
          invoice={{
            invoiceNumber: selectedSale.invoiceNumber,
            createdAt: selectedSale.createdAt,
            customerName: selectedSale.customerName,
            customerPhone: selectedSale.customerPhone,
            cashierName: "অ্যাডমিন / ক্যাশিয়ার",
            items: selectedSale.items.map((it) => ({
              id: it.id,
              productName: it.productName,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              subtotal: it.subtotal,
              serials: it.serials,
            })),
            subtotal: selectedSale.subtotal,
            discount: selectedSale.discount,
            totalAmount: selectedSale.totalAmount,
            paidAmount: selectedSale.paidAmount,
            dueAmount: selectedSale.dueAmount,
          }}
          extraActions={
            <button
              type="button"
              onClick={() => setShowReturnModal(true)}
              className="px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>পণ্য ফেরত (Return)</span>
            </button>
          }
          onClose={() => setSelectedSale(null)}
        />
      )}

      {/* Return Modal */}
      {selectedSale && showReturnModal && (
        <div className="print:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-base text-foreground">
                  পণ্য ফেরত প্রসেস ({selectedSale.invoiceNumber})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {actionSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            <form onSubmit={handleProcessReturn} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-1">
                  ফেরতযোগ্য পণ্য সিলেক্ট করুন
                </label>
                <select
                  value={returnItemId}
                  onChange={(e) => setReturnItemId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border bg-background text-foreground"
                >
                  {selectedSale.items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.productName} ({it.quantity} টি x {formatBDT(it.unitPrice)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">ফেরতের পরিমাণ (Quantity)</label>
                <input
                  type="number"
                  min="1"
                  max={selectedSale.items.find((i) => i.id === returnItemId)?.quantity || 1}
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">রিফান্ড পদ্ধতি</label>
                <select
                  value={returnMethod}
                  onChange={(e) => setReturnMethod(e.target.value as any)}
                  className="w-full p-2.5 rounded-lg border bg-background text-foreground"
                >
                  <option value="CASH">ক্যাশ রিফান্ড (Cash Payout)</option>
                  <option value="BANK">ব্যাংক / bKash রিফান্ড</option>
                  {selectedSale.dueAmount > 0 && (
                    <option value="ADJUST_DUE">বকেয়া থেকে সমন্বয় (Adjust Due)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">ফেরতের কারণ</label>
                <input
                  type="text"
                  placeholder="যেমন: ত্রুটিযুক্ত ডিসপ্লে, মডেল পরিবর্তন..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full p-2 rounded-lg border bg-background text-foreground"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="px-3 py-2 rounded-lg border hover:bg-muted text-muted-foreground font-medium"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:opacity-50"
                >
                  {loading ? "প্রসেস হচ্ছে..." : "ফেরত নিশ্চিত করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
