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

  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      search === "" ||
      s.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (s.customerPhone && s.customerPhone.includes(search));

    const matchesStatus = statusFilter === "ALL" || s.paymentStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="ইনভয়েস নং, গ্রাহকের নাম বা ফোন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="ALL">সকল স্ট্যাটাস (All Status)</option>
            <option value="PAID">পরিশোধিত (PAID)</option>
            <option value="PARTIALLY_PAID">আংশিক বকেয়া (PARTIAL)</option>
            <option value="DUE">বকেয়া (DUE)</option>
          </select>
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="border rounded-xl bg-card shadow-2xs overflow-hidden">
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
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    কোনো বিক্রয়ের রেকর্ড পাওয়া যায়নি।
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
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium"
                        title="রশিদ দেখুন"
                      >
                        <Eye className="w-4 h-4 text-primary" />
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

      {/* Receipt View Modal */}
      {selectedSale && !showReturnModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border p-6 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg text-foreground">
                  ক্যাশ মেমো (Cash Memo)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Card */}
            <div className="bg-white text-slate-900 p-6 rounded-xl border border-slate-200 text-sm space-y-4 font-mono shadow-xs">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <h2 className="text-lg font-black tracking-wider text-slate-950">RASHED TELECOM</h2>
                <p className="text-xs text-slate-600">Mobile Sales, Servicing & Accessories</p>
                <p className="text-xs text-slate-500">কালিয়াকৈর, গাজীপুর | হেল্পলাইন: 01712-000000</p>
              </div>

              <div className="flex justify-between text-xs text-slate-600 border-b border-dashed border-slate-300 pb-2">
                <div>
                  <div><span className="font-semibold">চালান:</span> {selectedSale.invoiceNumber}</div>
                  <div><span className="font-semibold">তারিখ:</span> {formatDateTimeDhaka(new Date(selectedSale.createdAt))}</div>
                </div>
                <div className="text-right">
                  <div><span className="font-semibold">গ্রাহক:</span> {selectedSale.customerName}</div>
                  {selectedSale.customerPhone && <div><span className="font-semibold">মোবাইল:</span> {selectedSale.customerPhone}</div>}
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <div className="flex justify-between font-bold text-xs border-b border-slate-300 pb-1">
                  <span>বিবরণ (Item)</span>
                  <span>পরিমাণ x দর = মোট</span>
                </div>
                {selectedSale.items.map((item, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="font-semibold text-slate-900">{item.productName}</div>
                    {item.serials.length > 0 && (
                      <div className="text-[11px] text-slate-500">
                        IMEI/SN: {item.serials.join(", ")}
                      </div>
                    )}
                    <div className="flex justify-between text-slate-700">
                      <span>{item.quantity} x {formatBDT(item.unitPrice)}</span>
                      <span>{formatBDT(item.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>উপমোট (Subtotal):</span>
                  <span>{formatBDT(selectedSale.subtotal)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>ডিসকাউন্ট (Discount):</span>
                    <span>-{formatBDT(selectedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-slate-950 pt-1 border-t">
                  <span>সর্বমোট প্রদেয় (Total):</span>
                  <span>{formatBDT(selectedSale.totalAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-700">
                  <span>পরিশোধিত (Paid):</span>
                  <span>{formatBDT(selectedSale.paidAmount)}</span>
                </div>
                {selectedSale.dueAmount > 0 && (
                  <div className="flex justify-between font-bold text-rose-600">
                    <span>বকেয়া (Due):</span>
                    <span>{formatBDT(selectedSale.dueAmount)}</span>
                  </div>
                )}
              </div>

              <div className="text-center text-[11px] text-slate-500 pt-2 border-t border-dashed border-slate-300">
                ধন্যবাদ আবার আসবেন! বিক্রয়কৃত পণ্য ৭ দিনের মধ্যে পরিবর্তনের সুযোগ আছে।
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReturnModal(true)}
                className="px-4 py-2 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>পণ্য ফেরত (Return)</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>প্রিন্ট রসিদ (Print)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {selectedSale && showReturnModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
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
