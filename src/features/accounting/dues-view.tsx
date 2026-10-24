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
      {/* Header Banner */}
      <div className="bg-card p-6 rounded-xl border shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <AlertCircle className="w-7 h-7 text-amber-500" />
            গ্রাহকের বকেয়া খতিয়ান (Customer Dues & Receivables)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            গ্রাহকদের কাছ থেকে পাওনা বকেয়া পর্যবেক্ষণ করুন এবং অ্যাকাউন্টিং নিয়মানুযায়ী আদায় করুন।
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card p-5 rounded-xl border shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            মোট বকেয়া পাওনা (Accounts Receivable)
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatBDT(totalOutstandingDue)}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              {customersWithDue.length} জন গ্রাহক
            </span>
          </div>
        </div>

        <div className="bg-card p-5 rounded-xl border shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            অ্যাকাউন্টিং নিয়ম (Strict Principle)
          </span>
          <div className="mt-2 text-xs text-muted-foreground leading-relaxed">
            বকেয়া আদায়ের টাকা কখনোই নতুন বিক্রয় বা আয় নয়; এটি প্রদেয় খাত (AR 1100) সমন্বয় করে।
          </div>
        </div>

        <div className="bg-card p-5 rounded-xl border shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            স্বয়ংক্রিয় জাবেদা
          </span>
          <div className="mt-2 flex items-center gap-2 text-emerald-600 font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            ডেবিট: ক্যাশ/ব্যাংক | ক্রেডিট: পাওনাদার খাত
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-card p-4 rounded-xl border shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="গ্রাহকের নাম বা মোবাইল নম্বর দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border bg-background focus:outline-hidden"
          />
        </div>
      </div>

      {/* Dues Table */}
      <div className="bg-card rounded-xl border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
              <tr>
                <th className="px-4 py-3">গ্রাহকের নাম</th>
                <th className="px-4 py-3">মোবাইল নম্বর</th>
                <th className="px-4 py-3">ঠিকানা</th>
                <th className="px-4 py-3 text-right">বকেয়ার পরিমাণ (৳)</th>
                <th className="px-4 py-3 text-center">পদক্ষেপ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">
                    কোন বকেয়া পাওনা পাওয়া যায়নি। সকল গ্রাহকের হিসাব পরিশোধিত।
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {c.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {c.phone}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.address || "—"}</td>
                    <td className="px-4 py-3 text-right font-bold font-mono text-amber-600 dark:text-amber-400">
                      {formatBDT(c.totalDue)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleOpenCollectModal(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border shadow-xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b">
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <ArrowDownRight className="w-5 h-5 text-emerald-600" />
                বকেয়া টাকা আদায় (Collect Due)
              </h2>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCollectSubmit} className="mt-4 space-y-4">
              <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-1">
                <div className="font-semibold text-foreground">
                  গ্রাহক: {selectedCustomer.name} ({selectedCustomer.phone})
                </div>
                <div className="text-amber-600 dark:text-amber-400 font-bold">
                  বর্তমান মোট বকেয়া: {formatBDT(selectedCustomer.totalDue)}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
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
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background font-bold text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  পেমেন্ট মাধ্যম (Payment Method) *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as "CASH" | "BANK" | "BKASH" | "NAGAD")
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                >
                  <option value="CASH">ক্যাশ (Cash on Hand 1000)</option>
                  <option value="BKASH">বিকাশ (bKash 1010)</option>
                  <option value="NAGAD">নগদ (Nagad 1010)</option>
                  <option value="BANK">ব্যাংক অ্যাকাউন্ট (Bank 1010)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  ট্রানজেকশন / রেফারেন্স আইডি (Ref ID)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: bKash TrxID বা রশিদ নম্বর"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
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
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="px-4 py-2 text-sm rounded-lg border hover:bg-muted"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
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
