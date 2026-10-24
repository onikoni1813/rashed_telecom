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
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-primary" />
            খরচের হিসাব ও ভাউচার (Expense Management)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            দোকান ও ব্যবসা পরিচালনার দৈনন্দিন খরচসমূহ ডাবল-এন্ট্রি ব্যালেন্সিং সহকারে রেকর্ড করুন।
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity shadow-xs"
        >
          <Plus className="w-4 h-4" />
          নতুন খরচ যোগ করুন
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card p-5 rounded-xl border shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            সর্বমোট খরচ (Total Expenses)
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">
              {formatBDT(totalExpenseAmount)}
            </span>
            <span className="text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-semibold px-2 py-0.5 rounded-full">
              {expenses.length} টি ভাউচার
            </span>
          </div>
        </div>

        <div className="bg-card p-5 rounded-xl border shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            ব্যবসায়িক খাত (Categories)
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">
              {categories.length} টি খাত
            </span>
            <span className="text-xs text-muted-foreground">সক্রিয় চার্ট</span>
          </div>
        </div>

        <div className="bg-card p-5 rounded-xl border shadow-xs">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            অ্যাকাউন্টিং যাচাই (Double Entry)
          </span>
          <div className="mt-2 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-600">
              জাবেদা ও খতিয়ান স্বয়ংক্রিয় ব্যালেন্সড
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-4 rounded-xl border shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="ভাউচার নং, প্রাপক, খাত বা বিবরণ দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-sm rounded-lg border bg-background focus:outline-hidden"
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
      <div className="bg-card rounded-xl border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
              <tr>
                <th className="px-4 py-3">ভাউচার নং</th>
                <th className="px-4 py-3">তারিখ</th>
                <th className="px-4 py-3">খরচের খাত</th>
                <th className="px-4 py-3">প্রাপক / বাবদ</th>
                <th className="px-4 py-3">পদ্ধতি</th>
                <th className="px-4 py-3 text-right">পরিমাণ (৳)</th>
                <th className="px-4 py-3">রেকর্ডকারী</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    কোন খরচের রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-primary">
                      {e.expenseNumber}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDhakaDate(new Date(e.expenseDate))}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                        {e.categoryName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{e.payee || "—"}</div>
                      {e.notes && (
                        <div className="text-xs text-muted-foreground truncate max-w-xs">
                          {e.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-1 rounded-md bg-muted text-foreground">
                        {e.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600 dark:text-rose-400">
                      {formatBDT(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border shadow-xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                নতুন খরচ রেকর্ড করুন (Record Expense)
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
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

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  খরচের খাত (Expense Category) *
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background focus:outline-hidden"
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
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    টাকার পরিমাণ (BDT ৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background font-bold text-foreground"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    পরিশোধের মাধ্যম (Payment Method) *
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentMethod: e.target.value as "CASH" | "BANK" | "BKASH" | "NAGAD",
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                  >
                    <option value="CASH">ক্যাশ (Cash on Hand 1000)</option>
                    <option value="BKASH">বিকাশ (bKash 1010)</option>
                    <option value="NAGAD">নগদ (Nagad 1010)</option>
                    <option value="BANK">ব্যাংক একাউন্ট (Bank 1010)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  প্রাপকের নাম / বাবদ (Payee / Purpose)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: দোকান ভাড়াবাবদ, বিদ্যুৎ বিল, নাস্তা বাবদ"
                  value={formData.payee}
                  onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
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
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
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
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg border hover:bg-muted font-medium"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
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
