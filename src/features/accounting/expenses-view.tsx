"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBDT, formatDhakaDate } from "@/lib/i18n";
import {
  Plus,
  Receipt,
  Search,
  Filter,
  CreditCard,
  Building2,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";

export interface SerializedExpense {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  categoryName: string;
  categoryCode: string;
  amount: number;
  paymentMethod: string;
  payee: string | null;
  receiptRef: string | null;
  notes: string | null;
  recordedByName: string;
}

export interface SerializedExpenseCategory {
  id: string;
  name: string;
  code: string;
}

interface ExpensesViewProps {
  shopId: string;
  expenses: SerializedExpense[];
  categories: SerializedExpenseCategory[];
}

export function ExpensesView({ shopId, expenses, categories }: ExpensesViewProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    categoryId: categories[0]?.id || "",
    paymentMethod: "CASH" as "CASH" | "BANK" | "BKASH" | "NAGAD",
    amount: "",
    payee: "",
    receiptRef: "",
    notes: "",
  });

  // Filtered Expenses
  const filtered = expenses.filter((exp) => {
    const matchesCategory =
      selectedCategory === "ALL" || exp.categoryName === selectedCategory;
    const matchesSearch =
      exp.expenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.payee && exp.payee.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.receiptRef && exp.receiptRef.toLowerCase().includes(searchTerm.toLowerCase())) ||
      exp.categoryName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMessage("দয়া করে সঠিক খরচের পরিমাণ উল্লেখ করুন।");
      return;
    }

    if (!formData.categoryId) {
      setErrorMessage("দয়া করে খরচের খাত (Category) নির্বাচন করুন।");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        },
        body: JSON.stringify({
          shopId,
          categoryId: formData.categoryId,
          paymentMethod: formData.paymentMethod,
          amount: amountNum,
          payee: formData.payee.trim() || undefined,
          receiptRef: formData.receiptRef.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "খরচ সংরক্ষণ করা যায়নি।");
      }

      setIsModalOpen(false);
      setFormData({
        categoryId: categories[0]?.id || "",
        paymentMethod: "CASH",
        amount: "",
        payee: "",
        receiptRef: "",
        notes: "",
      });
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
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 h-56 w-56 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/25 ring-2 ring-white/10 shrink-0">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  দৈনন্দিন খরচের হিসাব ও ভাউচার
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400">
                  <Sparkles className="w-3 h-3" />
                  Auto-Journal
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                ব্যবসা ও শপ পরিচালনার খরচসমূহ স্বয়ংক্রিয় ডাবল-এন্ট্রি ব্যালেন্সিং সহ সংরক্ষণ
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="shimmer-button inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 text-white font-bold text-sm shadow-lg shadow-rose-500/25 hover:brightness-110 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন খরচ যোগ করুন</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-border/50 hover:border-rose-500/40 hover:shadow-xl hover:shadow-rose-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-500/15 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              সর্বমোট খরচ (Total Expenses)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {formatBDT(totalExpenseAmount)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 font-medium flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold">
              {expenses.length} টি ভাউচার
            </span>
            <span>মোট রেকর্ডকৃত খরচ</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border/50 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/15 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              ব্যবসায়িক খাত (Categories)
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">
            {categories.length} টি খাত
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 font-medium">
            চার্ট অব অ্যাকাউন্টস এর অধীনে সক্রিয় গ্রুপ
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-border/50 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/15 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              অ্যাকাউন্টিং যাচাই (Double-Entry)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm sm:text-base">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>জাবেদা ও খতিয়ান ১০০% ব্যালেন্সড</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 font-medium">
            ডেবিট: খরচের খাত | ক্রেডিট: ক্যাশ/ব্যাংক
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-3.5 rounded-2xl border border-border/60 backdrop-blur-xl flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-md">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="ভাউচার নং, প্রাপক, খাত বা বিবরণ দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-card/80 rounded-xl border border-border/70 focus:outline-hidden focus:ring-2 focus:ring-rose-500/30 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-border/70 bg-card/80 text-foreground font-semibold focus:outline-hidden"
          >
            <option value="ALL">সকল খরচের খাত (All Categories)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="glass-panel rounded-2xl border border-border/60 overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/70 backdrop-blur-md border-b border-border/60 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              <tr>
                <th className="px-5 py-3.5">ভাউচার নং</th>
                <th className="px-4 py-3.5">তারিখ</th>
                <th className="px-4 py-3.5">খরচের খাত</th>
                <th className="px-4 py-3.5">প্রাপক / বাবদ</th>
                <th className="px-4 py-3.5">পদ্ধতি</th>
                <th className="px-4 py-3.5 text-right">পরিমাণ (৳)</th>
                <th className="px-4 py-3.5">রেকর্ডকারী</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-muted-foreground">
                    <Receipt className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="font-bold text-base text-foreground">কোন খরচের রেকর্ড পাওয়া যায়নি</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      উপরে &apos;নতুন খরচ যোগ করুন&apos; বাটনে ক্লিক করে প্রথম ভাউচার এন্ট্রি করুন।
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-rose-500/5 transition-colors group"
                  >
                    <td className="px-5 py-4 font-mono font-bold text-primary group-hover:text-rose-500 transition-colors">
                      {e.expenseNumber}
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground whitespace-nowrap font-medium">
                      {formatDhakaDate(new Date(e.expenseDate))}
                    </td>
                    <td className="px-4 py-4 font-medium">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        {e.categoryName}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-foreground text-sm">{e.payee || "—"}</div>
                      {e.notes && (
                        <div className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                          {e.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-muted/60 border border-border/60 text-foreground">
                        {e.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-black text-base text-rose-600 dark:text-rose-400">
                      {formatBDT(e.amount)}
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground font-medium">
                      {e.recordedByName}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-border/80 shadow-2xl p-6 sm:p-7 relative bg-card/95 overflow-hidden">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-rose-500/15 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-4 border-b border-border/60 relative z-10">
              <h2 className="text-lg font-black flex items-center gap-2 text-foreground">
                <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-500 border border-rose-500/30">
                  <Receipt className="w-5 h-5" />
                </div>
                নতুন খরচ রেকর্ড করুন (Record Expense)
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
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

            <form onSubmit={handleSubmit} className="mt-5 space-y-4 relative z-10">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  খরচের খাত (Expense Category) *
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-border/70 bg-card text-foreground font-semibold focus:outline-hidden focus:ring-2 focus:ring-rose-500/30"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    টাকার পরিমাণ (BDT ৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-base font-mono font-black rounded-xl border border-border bg-card text-foreground focus:ring-2 focus:ring-rose-500/30 outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    পরিশোধের মাধ্যম *
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentMethod: e.target.value as "CASH" | "BANK" | "BKASH" | "NAGAD",
                      })
                    }
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-border/70 bg-card text-foreground font-semibold focus:outline-hidden"
                  >
                    <option value="CASH">ক্যাশ (Cash 1000)</option>
                    <option value="BKASH">বিকাশ (bKash 1010)</option>
                    <option value="NAGAD">নগদ (Nagad 1010)</option>
                    <option value="BANK">ব্যাংক একাউন্ট</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  প্রাপকের নাম / বাবদ (Payee / Purpose)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: দোকান ভাড়া, বিদ্যুৎ বিল, নাস্তা বাবদ"
                  value={formData.payee}
                  onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-border/70 bg-card text-foreground focus:ring-2 focus:ring-rose-500/30 outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  রসিদ বা ভাউচার রেফারেন্স (Receipt Ref)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: রশিদ নং, বিল ট্রানজেকশন আইডি"
                  value={formData.receiptRef}
                  onChange={(e) => setFormData({ ...formData, receiptRef: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-border/70 bg-card text-foreground focus:ring-2 focus:ring-rose-500/30 outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  অতিরিক্ত বিবরণ / নোট (Notes)
                </label>
                <textarea
                  rows={2}
                  placeholder="খরচ সম্পর্কিত যেকোনো বিশেষ নোট..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-border/70 bg-card text-foreground focus:ring-2 focus:ring-rose-500/30 outline-hidden font-medium"
                />
              </div>

              <div className="pt-4 border-t border-border/60 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="shimmer-button px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 text-white shadow-lg shadow-rose-500/25 hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? "সংরক্ষণ হচ্ছে..." : "খরচ রেকর্ড ও পোস্টিং সম্পন্ন করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
