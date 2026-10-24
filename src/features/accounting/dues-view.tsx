"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBDT } from "@/lib/i18n";
import {
  AlertCircle,
  Search,
  CheckCircle2,
  DollarSign,
  Phone,
  User,
  CreditCard,
  ArrowDownRight,
  X,
  Sparkles,
  BookOpen,
  ShieldCheck,
} from "lucide-react";

export interface SerializedCustomerDue {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  totalDue: number;
}

interface DuesViewProps {
  shopId: string;
  customersWithDue: SerializedCustomerDue[];
}

export function DuesView({ shopId, customersWithDue }: DuesViewProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<SerializedCustomerDue | null>(null);
  const [collectionAmount, setCollectionAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK" | "BKASH" | "NAGAD">("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filtered = customersWithDue.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  const totalOutstandingDue = customersWithDue.reduce((sum, c) => sum + c.totalDue, 0);

  const handleOpenCollectModal = (c: SerializedCustomerDue) => {
    setSelectedCustomer(c);
    setCollectionAmount(c.totalDue.toString());
    setPaymentMethod("CASH");
    setReferenceNumber("");
    setNotes("");
    setErrorMessage(null);
  };

  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setErrorMessage(null);

    const amountNum = parseFloat(collectionAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMessage("দয়া করে সঠিক আদায়ের পরিমাণ দিন।");
      return;
    }

    if (amountNum > selectedCustomer.totalDue) {
      setErrorMessage(
        `আদায়ের পরিমাণ (৳${amountNum}) গ্রাহকের মোট বকেয়া (৳${selectedCustomer.totalDue}) থেকে বেশি হতে পারবে না।`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/dues/collect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `due-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        },
        body: JSON.stringify({
          shopId,
          customerId: selectedCustomer.id,
          amount: amountNum,
          paymentMethod,
          referenceNumber: referenceNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "বকেয়া আদায় সংরক্ষণ করা যায়নি।");
      }

      setSelectedCustomer(null);
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "সমস্যা হয়েছে");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Elevated Command Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-r from-card/90 via-card/60 to-card/90 p-6 sm:p-7 backdrop-blur-xl shadow-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 h-56 w-56 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25 ring-2 ring-white/10 shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  গ্রাহকের বকেয়া খতিয়ান ও আদায়
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400">
                  <Sparkles className="w-3 h-3" />
                  AR 1100
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                গ্রাহকদের বাকি খতিয়ান পর্যবেক্ষণ ও ডাবল-এন্ট্রি অ্যাকাউন্টিং নিয়মানুযায়ী আদায়
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>GAAP Compliant Ledger</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-border/50 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/15 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            মোট বকেয়া পাওনা (Accounts Receivable)
          </span>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {formatBDT(totalOutstandingDue)}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              {customersWithDue.length} জন গ্রাহক
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 font-medium">
            সক্রিয় বকেয়া অ্যাকাউন্ট ব্যালেন্স
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border/50 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/15 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5 text-blue-500" />
            <span>অ্যাকাউন্টিং নীতি (Double-Entry Rule)</span>
          </div>
          <div className="mt-3 text-xs text-muted-foreground leading-relaxed font-medium">
            বকেয়া আদায়ের টাকা কখনোই নতুন বিক্রয় বা আয় নয়। এটি সরাসরি গ্রাহক প্রদেয় খাত (AR 1100) সমন্বয় করে ক্যাশ বৃদ্ধি করে।
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border/50 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/15 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            স্বয়ংক্রিয় জাবেদা ইন্টিগ্রেশন
          </span>
          <div className="mt-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>ডেবিট: ক্যাশ/ব্যাংক | ক্রেডিট: পাওনাদার</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 font-medium">
            প্রতিটি ট্রানজেকশনে সাথে সাথে জেনারেল লেজার পোস্ট হয়
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-3.5 rounded-2xl border border-border/60 backdrop-blur-xl shadow-md">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="গ্রাহকের নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-card/80 rounded-xl border border-border/70 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 transition-all font-medium"
          />
        </div>
      </div>

      {/* Dues Table */}
      <div className="glass-panel rounded-2xl border border-border/60 overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/70 backdrop-blur-md border-b border-border/60 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              <tr>
                <th className="px-5 py-3.5">গ্রাহকের নাম</th>
                <th className="px-4 py-3.5">মোবাইল নম্বর</th>
                <th className="px-4 py-3.5">ঠিকানা</th>
                <th className="px-4 py-3.5 text-right">বকেয়ার পরিমাণ (৳)</th>
                <th className="px-4 py-3.5 text-center">পদক্ষেপ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/40 mb-3" />
                    <p className="font-bold text-base text-foreground">কোন বকেয়া পাওনা নেই</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      সকল গ্রাহকের হিসাব পরিশোধিত এবং স্বচ্ছ রয়েছে।
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-amber-500/5 transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-xs shrink-0">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-foreground group-hover:text-amber-500 transition-colors">
                            {c.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-muted-foreground">
                      {c.phone}
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground font-medium">
                      {c.address || "—"}
                    </td>
                    <td className="px-4 py-4 text-right font-bold font-mono text-base text-amber-600 dark:text-amber-400">
                      {formatBDT(c.totalDue)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleOpenCollectModal(c)}
                        className="shimmer-button inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:brightness-110 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                      >
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        বকেয়া আদায় করুন
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collect Due Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-border/80 shadow-2xl p-6 sm:p-7 relative bg-card/95 overflow-hidden">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-4 border-b border-border/60 relative z-10">
              <h2 className="text-lg font-black flex items-center gap-2 text-foreground">
                <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
                বকেয়া টাকা আদায় (Collect Due)
              </h2>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCollectSubmit} className="mt-5 space-y-4 relative z-10">
              <div className="glass-card p-3.5 rounded-2xl border border-border/60 bg-muted/30 text-xs space-y-1.5">
                <div className="font-bold text-foreground text-sm">
                  {selectedCustomer.name} ({selectedCustomer.phone})
                </div>
                <div className="text-amber-600 dark:text-amber-400 font-mono font-bold text-xs flex items-center justify-between">
                  <span>বর্তমান বকেয়া পাওনা:</span>
                  <span className="text-sm">{formatBDT(selectedCustomer.totalDue)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  আদায়ের পরিমাণ (BDT ৳) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={selectedCustomer.totalDue}
                  required
                  value={collectionAmount}
                  onChange={(e) => setCollectionAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base font-mono font-black rounded-xl border border-border bg-card text-foreground focus:ring-2 focus:ring-emerald-500/30 outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  পেমেন্ট মাধ্যম (Payment Method) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["CASH", "BKASH", "NAGAD", "BANK"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                        paymentMethod === method
                          ? "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/25"
                          : "border-border/60 bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {method === "CASH" && "নগদ ক্যাশ (1000)"}
                      {method === "BKASH" && "বিকাশ (bKash)"}
                      {method === "NAGAD" && "নগদ (Nagad)"}
                      {method === "BANK" && "ব্যাংক অ্যাকাউন্ট"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  ট্রানজেকশন / রেফারেন্স আইডি (Ref ID)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: bKash TrxID বা ভাউচার নম্বর"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-border/70 bg-card text-foreground focus:ring-2 focus:ring-emerald-500/30 outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  মন্তব্য / নোট (Notes)
                </label>
                <input
                  type="text"
                  placeholder="বকেয়া আদায়ের নোট..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-border/70 bg-card text-foreground focus:ring-2 focus:ring-emerald-500/30 outline-hidden font-medium"
                />
              </div>

              <div className="pt-4 border-t border-border/60 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="shimmer-button px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? "আদায় হচ্ছে..." : "বকেয়া আদায় নিশ্চিত করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
