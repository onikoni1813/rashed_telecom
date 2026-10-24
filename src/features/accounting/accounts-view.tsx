"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBDT, formatDhakaDate } from "@/lib/i18n";
import {
  BookOpen,
  Scale,
  FileSpreadsheet,
  ArrowRightLeft,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  DollarSign,
  Building,
  UserCheck,
  ShieldCheck,
  X,
} from "lucide-react";

export interface SerializedAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
}

export interface SerializedJournalLine {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
  description: string | null;
}

export interface SerializedJournalEntry {
  id: string;
  entryDate: string;
  sourceType: string;
  sourceId: string;
  description: string;
  isReversed: boolean;
  lines: SerializedJournalLine[];
}

export interface TrialBalanceData {
  rows: SerializedAccount[];
  totalDebits: number;
  totalCredits: number;
  diff: number;
  isBalanced: boolean;
  asOfDate: string;
}

export interface BalanceSheetData {
  asOfDate: string;
  assets: {
    cashOnHand: number;
    bankMFS: number;
    accountsReceivable: number;
    inventory: number;
    totalAssets: number;
  };
  liabilities: {
    accountsPayable: number;
    customerAdvances: number;
    loansPayable: number;
    totalLiabilities: number;
  };
  equity: {
    ownerCapital: number;
    ownerDrawings: number;
    retainedEarnings: number;
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
  difference: number;
  isBalanced: boolean;
}

interface AccountsViewProps {
  shopId: string;
  accounts: SerializedAccount[];
  journalEntries: SerializedJournalEntry[];
  trialBalance: TrialBalanceData;
  balanceSheet: BalanceSheetData;
}

export function AccountsView({
  shopId,
  accounts,
  journalEntries,
  trialBalance,
  balanceSheet,
}: AccountsViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"LEDGER" | "CHART" | "TRIAL_BALANCE" | "BALANCE_SHEET">("LEDGER");
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("ALL");

  // Reversal Modal
  const [reversalTarget, setReversalTarget] = useState<SerializedJournalEntry | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [isSubmittingReversal, setIsSubmittingReversal] = useState(false);
  const [reversalError, setReversalError] = useState<string | null>(null);

  // Owner Tx Modal
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [ownerTxData, setOwnerTxData] = useState({
    type: "INJECTION" as "INJECTION" | "DRAWING",
    amount: "",
    paymentMethod: "CASH" as "CASH" | "BANK" | "BKASH" | "NAGAD",
    notes: "",
  });
  const [isSubmittingOwnerTx, setIsSubmittingOwnerTx] = useState(false);
  const [ownerTxError, setOwnerTxError] = useState<string | null>(null);

  // Filtered Journal Entries
  const filteredEntries = journalEntries.filter((entry) => {
    const matchesSource =
      sourceTypeFilter === "ALL" || entry.sourceType === sourceTypeFilter;
    const matchesSearch =
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.lines.some(
        (l) =>
          l.accountCode.includes(searchTerm) ||
          l.accountName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    return matchesSource && matchesSearch;
  });

  const handleReverseEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget) return;
    setReversalError(null);

    if (reversalReason.trim().length < 3) {
      setReversalError("দয়া করে রিভার্সালের সঠিক কারণ উল্লেখ করুন (কমপক্ষে ৩ অক্ষর)।");
      return;
    }

    setIsSubmittingReversal(true);
    try {
      const res = await fetch(`/api/v1/accounts/journal/${reversalTarget.id}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          reason: reversalReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "রিভার্সাল করা যায়নি।");
      }

      setReversalTarget(null);
      setReversalReason("");
      router.refresh();
    } catch (err: unknown) {
      setReversalError(err instanceof Error ? err.message : "সমস্যা হয়েছে");
    } finally {
      setIsSubmittingReversal(false);
    }
  };

  const handleOwnerTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerTxError(null);

    const amountNum = parseFloat(ownerTxData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setOwnerTxError("সঠিক টাকার পরিমাণ প্রদান করুন।");
      return;
    }

    setIsSubmittingOwnerTx(true);
    try {
      const res = await fetch("/api/v1/accounting/owner-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          type: ownerTxData.type,
          amount: amountNum,
          paymentMethod: ownerTxData.paymentMethod,
          notes: ownerTxData.notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "লেনদেন সম্পন্ন হয়নি।");
      }

      setIsOwnerModalOpen(false);
      setOwnerTxData({
        type: "INJECTION",
        amount: "",
        paymentMethod: "CASH",
        notes: "",
      });
      router.refresh();
    } catch (err: unknown) {
      setOwnerTxError(err instanceof Error ? err.message : "সমস্যা হয়েছে");
    } finally {
      setIsSubmittingOwnerTx(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header with Glassmorphism & Ambient Glow */}
      <div className="relative overflow-hidden rounded-3xl border border-white/60 dark:border-white/10 glass-panel p-6 sm:p-8 shadow-xl">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  সাধারণ খতিয়ান ও অ্যাকাউন্টিং
                </h1>
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/25 flex items-center gap-1.5 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ১০০% ব্যালেন্সড
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                দ্বি-তরফা দাখিলা পদ্ধতিতে স্বয়ংক্রিয় জার্নাল এন্ট্রি, রেওয়ামিল ও আর্থিক উদ্বৃত্তপত্র
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              onClick={() => setIsOwnerModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <UserCheck className="w-4 h-4" />
              <span>মালিকের মূলধন / উত্তোলন</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Pill Tabs Navigation */}
      <div className="p-1.5 bg-muted/60 dark:bg-muted/30 border border-border/80 rounded-2xl backdrop-blur-md flex items-center gap-1.5 overflow-x-auto scrollbar-none shadow-inner">
        <button
          onClick={() => setActiveTab("LEDGER")}
          className={`px-4 sm:px-5 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === "LEDGER"
              ? "bg-card text-primary shadow-md border border-border/60 scale-[1.01]"
              : "text-muted-foreground hover:text-foreground hover:bg-card/40"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          জাবেদা ও খতিয়ান (Journal Ledger)
        </button>

        <button
          onClick={() => setActiveTab("TRIAL_BALANCE")}
          className={`px-4 sm:px-5 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === "TRIAL_BALANCE"
              ? "bg-card text-primary shadow-md border border-border/60 scale-[1.01]"
              : "text-muted-foreground hover:text-foreground hover:bg-card/40"
          }`}
        >
          <Scale className="w-4 h-4" />
          রেওয়ামিল (Trial Balance)
        </button>

        <button
          onClick={() => setActiveTab("BALANCE_SHEET")}
          className={`px-4 sm:px-5 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === "BALANCE_SHEET"
              ? "bg-card text-primary shadow-md border border-border/60 scale-[1.01]"
              : "text-muted-foreground hover:text-foreground hover:bg-card/40"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          উদ্বৃত্তপত্র (Balance Sheet)
        </button>

        <button
          onClick={() => setActiveTab("CHART")}
          className={`px-4 sm:px-5 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === "CHART"
              ? "bg-card text-primary shadow-md border border-border/60 scale-[1.01]"
              : "text-muted-foreground hover:text-foreground hover:bg-card/40"
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          হিসাবের চার্ট (Chart of Accounts)
        </button>
      </div>

      {/* TAB 1: GENERAL LEDGER */}
      {activeTab === "LEDGER" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-4 rounded-xl border shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="এন্ট্রি বিবরণ বা অ্যাকাউন্ট কোড দিয়ে খুঁজুন..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border bg-background focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={sourceTypeFilter}
                onChange={(e) => setSourceTypeFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-sm rounded-lg border bg-background"
              >
                <option value="ALL">সকল উৎস (All Source Types)</option>
                <option value="SALE">বিক্রয় (Sale)</option>
                <option value="PAYMENT">পেমেন্ট / আদায় (Payment)</option>
                <option value="EXPENSE">খরচ (Expense)</option>
                <option value="SALES_RETURN">ফেরত (Sales Return)</option>
                <option value="PURCHASE_RECEIPT">ক্রয় (Purchase Receipt)</option>
              </select>
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                  <tr>
                    <th className="px-4 py-3">তারিখ ও উৎস</th>
                    <th className="px-4 py-3">বিবরণ</th>
                    <th className="px-4 py-3">হিসাব ও কোড</th>
                    <th className="px-4 py-3 text-right">ডেবিট (Debit ৳)</th>
                    <th className="px-4 py-3 text-right">ক্রেডিট (Credit ৳)</th>
                    <th className="px-4 py-3 text-center">পদক্ষেপ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground">
                        কোন জাবেদা এন্ট্রি পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry) => (
                      <React.Fragment key={entry.id}>
                        <tr className="bg-muted/20 font-semibold text-xs border-t">
                          <td className="px-4 py-2 text-foreground">
                            {formatDhakaDate(new Date(entry.entryDate))}
                            <span className="ml-2 font-mono text-[11px] px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary">
                              {entry.sourceType}
                            </span>
                          </td>
                          <td colSpan={4} className="px-4 py-2 text-foreground">
                            {entry.description}
                            {entry.isReversed && (
                              <span className="ml-2 px-1.5 py-0.5 rounded-sm text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                                রিভার্সড
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {!entry.isReversed && !entry.description.startsWith("[REVERSAL]") && (
                              <button
                                onClick={() => setReversalTarget(entry)}
                                title="এন্ট্রি রিভার্সাল করুন"
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 px-2 py-0.5 rounded-sm border border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              >
                                <RotateCcw className="w-3 h-3" />
                                সংশোধন/রিভার্স
                              </button>
                            )}
                          </td>
                        </tr>
                        {entry.lines.map((line) => (
                          <tr key={line.id} className="hover:bg-muted/10 text-xs">
                            <td className="px-4 py-1.5"></td>
                            <td className="px-4 py-1.5 text-muted-foreground pl-6">
                              {line.description || "—"}
                            </td>
                            <td className="px-4 py-1.5 font-medium text-foreground">
                              <span className="font-mono text-muted-foreground mr-1.5">
                                [{line.accountCode}]
                              </span>
                              {line.accountName}
                            </td>
                            <td className="px-4 py-1.5 text-right font-mono font-medium">
                              {line.debit > 0 ? formatBDT(line.debit) : "—"}
                            </td>
                            <td className="px-4 py-1.5 text-right font-mono font-medium">
                              {line.credit > 0 ? formatBDT(line.credit) : "—"}
                            </td>
                            <td></td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRIAL BALANCE */}
      {activeTab === "TRIAL_BALANCE" && (
        <div className="space-y-4">
          <div className="bg-card p-5 rounded-xl border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                রেওয়ামিল ব্যালেন্স পরীক্ষণ (Trial Balance Verification)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                অ্যাকাউন্টিং নীতি অনুযায়ী মোট ডেবিট এবং মোট ক্রেডিট সর্বদা সমান হতে হবে।
              </p>
            </div>

            <div className="flex items-center gap-3">
              {trialBalance.isBalanced ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  রেওয়ামিল ব্যালেন্সড (Debits === Credits)
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 font-bold text-sm">
                  <AlertCircle className="w-4 h-4" />
                  অমিল পাওয়া গেছে: ৳{trialBalance.diff.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                  <tr>
                    <th className="px-4 py-3">কোড</th>
                    <th className="px-4 py-3">হিসাবের নাম (Account Name)</th>
                    <th className="px-4 py-3">ধরন (Type)</th>
                    <th className="px-4 py-3 text-right">মোট ডেবিট (Debit ৳)</th>
                    <th className="px-4 py-3 text-right">মোট ক্রেডিট (Credit ৳)</th>
                    <th className="px-4 py-3 text-right">নিট ব্যালেন্স (Net ৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {trialBalance.rows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono font-bold text-primary">
                        {row.code}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-muted font-semibold text-muted-foreground">
                          {row.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {row.totalDebit > 0 ? formatBDT(row.totalDebit) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {row.totalCredit > 0 ? formatBDT(row.totalCredit) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                        {formatBDT(row.netBalance)}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-muted/60 font-bold border-t-2">
                    <td colSpan={3} className="px-4 py-3 text-right">
                      সর্বমোট (Total):
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {formatBDT(trialBalance.totalDebits)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {formatBDT(trialBalance.totalCredits)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {trialBalance.isBalanced ? "✓ ০.০০" : formatBDT(trialBalance.diff)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BALANCE SHEET */}
      {activeTab === "BALANCE_SHEET" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ASSETS */}
            <div className="bg-card rounded-xl border shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Building className="w-5 h-5 text-emerald-600" />
                  সম্পদসমূহ (Assets)
                </h3>
                <span className="text-xs font-semibold text-muted-foreground">চলতি সম্পদ</span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1.5 border-b border-dashed">
                  <span className="text-muted-foreground">হাতে নগদ (Cash on Hand 1000)</span>
                  <span className="font-mono font-semibold">
                    {formatBDT(balanceSheet.assets.cashOnHand)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-dashed">
                  <span className="text-muted-foreground">ব্যাংক ও এমএফএস (Bank/bKash 1010)</span>
                  <span className="font-mono font-semibold">
                    {formatBDT(balanceSheet.assets.bankMFS)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-dashed">
                  <span className="text-muted-foreground">গ্রাহকের কাছে পাওনা (Accounts Receivable 1100)</span>
                  <span className="font-mono font-semibold">
                    {formatBDT(balanceSheet.assets.accountsReceivable)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-dashed">
                  <span className="text-muted-foreground">দোকানের মজুদ পণ্য (Inventory 1200)</span>
                  <span className="font-mono font-semibold">
                    {formatBDT(balanceSheet.assets.inventory)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t-2 flex justify-between items-center font-bold text-base text-emerald-600 dark:text-emerald-400">
                <span>মোট সম্পদ (Total Assets)</span>
                <span className="font-mono">{formatBDT(balanceSheet.assets.totalAssets)}</span>
              </div>
            </div>

            {/* LIABILITIES & EQUITY */}
            <div className="space-y-6">
              {/* LIABILITIES */}
              <div className="bg-card rounded-xl border shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b">
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-rose-600" />
                    দায়সমূহ (Liabilities)
                  </h3>
                  <span className="text-xs font-semibold text-muted-foreground">পাওনাদার ও অগ্রিম</span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-dashed">
                    <span className="text-muted-foreground">সরবরাহকারীর পাওনা (Accounts Payable 2000)</span>
                    <span className="font-mono font-semibold">
                      {formatBDT(balanceSheet.liabilities.accountsPayable)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-dashed">
                    <span className="text-muted-foreground">গ্রাহক অগ্রিম (Customer Advances 2100)</span>
                    <span className="font-mono font-semibold">
                      {formatBDT(balanceSheet.liabilities.customerAdvances)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-dashed">
                    <span className="text-muted-foreground">ঋণ ও দায় (Loans Payable 2200)</span>
                    <span className="font-mono font-semibold">
                      {formatBDT(balanceSheet.liabilities.loansPayable)}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t flex justify-between items-center font-bold text-sm text-foreground">
                  <span>মোট দায় (Total Liabilities)</span>
                  <span className="font-mono">{formatBDT(balanceSheet.liabilities.totalLiabilities)}</span>
                </div>
              </div>

              {/* EQUITY */}
              <div className="bg-card rounded-xl border shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b">
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-blue-600" />
                    মালিকানা স্বত্ব (Equity)
                  </h3>
                  <span className="text-xs font-semibold text-muted-foreground">মূলধন ও সংরক্ষিত আয়</span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-dashed">
                    <span className="text-muted-foreground">মালিকের মূলধন (Owner Capital 3000)</span>
                    <span className="font-mono font-semibold">
                      {formatBDT(balanceSheet.equity.ownerCapital)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-dashed">
                    <span className="text-muted-foreground">মালিকের ব্যক্তিগত উত্তোলন (Owner Drawings 3100)</span>
                    <span className="font-mono font-semibold text-rose-600">
                      - {formatBDT(balanceSheet.equity.ownerDrawings)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-dashed">
                    <span className="text-muted-foreground">চলতি মেয়াদের নিট লাভ (Current Retained Earnings)</span>
                    <span className="font-mono font-semibold text-emerald-600">
                      {formatBDT(balanceSheet.equity.retainedEarnings)}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t flex justify-between items-center font-bold text-sm text-foreground">
                  <span>মোট মূলধন ও স্বত্ব (Total Equity)</span>
                  <span className="font-mono">{formatBDT(balanceSheet.equity.totalEquity)}</span>
                </div>
              </div>

              {/* TOTAL LIABILITIES & EQUITY */}
              <div className="bg-card rounded-xl border shadow-xs p-5 flex justify-between items-center font-bold text-base text-primary">
                <span>মোট দায় ও মালিকানা স্বত্ব (Liabilities + Equity)</span>
                <span className="font-mono">{formatBDT(balanceSheet.totalLiabilitiesAndEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CHART OF ACCOUNTS */}
      {activeTab === "CHART" && (
        <div className="bg-card rounded-xl border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                <tr>
                  <th className="px-4 py-3">কোড</th>
                  <th className="px-4 py-3">হিসাবের নাম (Account Title)</th>
                  <th className="px-4 py-3">শ্রেণী / ধরন (Category)</th>
                  <th className="px-4 py-3">স্বাভাবিক জের (Normal Balance)</th>
                  <th className="px-4 py-3 text-right">চলতি জের (Current Balance ৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono font-bold text-primary">{acc.code}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{acc.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-muted font-semibold">
                        {acc.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {acc.type === "ASSET" || acc.type === "EXPENSE" ? "ডেবিট (Debit)" : "ক্রেডিট (Credit)"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                      {formatBDT(acc.netBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REVERSAL MODAL */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border shadow-xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b">
              <h2 className="text-lg font-bold flex items-center gap-2 text-rose-600">
                <RotateCcw className="w-5 h-5" />
                জাবেদা এন্ট্রি রিভার্সাল / সংশোধন
              </h2>
              <button
                onClick={() => setReversalTarget(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reversalError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reversalError}</span>
              </div>
            )}

            <form onSubmit={handleReverseEntry} className="mt-4 space-y-4">
              <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-1">
                <div className="font-semibold text-foreground">
                  উৎস: {reversalTarget.sourceType}
                </div>
                <div className="text-muted-foreground">{reversalTarget.description}</div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  রিভার্সালের কারণ (Reversal Reason) *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="ভুল পোস্টিং সংশোধন, গ্রাহকের পরিবর্তন ইত্যাদি..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReversalTarget(null)}
                  className="px-4 py-2 text-sm rounded-lg border hover:bg-muted"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReversal}
                  className="px-4 py-2 text-sm rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:opacity-50"
                >
                  {isSubmittingReversal ? "রিভার্স হচ্ছে..." : "বিপরীত দাখিলা পোস্ট করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OWNER TRANSACTION MODAL */}
      {isOwnerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border shadow-xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b">
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <UserCheck className="w-5 h-5 text-primary" />
                মালিকের লেনদেন রেকর্ড (Owner Transactions)
              </h2>
              <button
                onClick={() => setIsOwnerModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {ownerTxError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{ownerTxError}</span>
              </div>
            )}

            <form onSubmit={handleOwnerTxSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  লেনদেনের ধরন (Transaction Type) *
                </label>
                <select
                  value={ownerTxData.type}
                  onChange={(e) =>
                    setOwnerTxData({
                      ...ownerTxData,
                      type: e.target.value as "INJECTION" | "DRAWING",
                    })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                >
                  <option value="INJECTION">মূলধন বিনিয়োগ (Capital Injection - ৩০০০)</option>
                  <option value="DRAWING">ব্যক্তিগত উত্তোলন (Owner Drawing - ৩১০০)</option>
                </select>
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  * নিয়ম: মালিকের ব্যক্তিগত উত্তোলন কখনোই অপারেটিং খরচ হিসেবে গণ্য হয় না।
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  টাকার পরিমাণ (BDT ৳) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0.00"
                  required
                  value={ownerTxData.amount}
                  onChange={(e) => setOwnerTxData({ ...ownerTxData, amount: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  মাধ্যম (Payment Method) *
                </label>
                <select
                  value={ownerTxData.paymentMethod}
                  onChange={(e) =>
                    setOwnerTxData({
                      ...ownerTxData,
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

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  নোট / বিবরণ (Notes)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: ব্যবসা সম্প্রসারণ বা ব্যক্তিগত ব্যয়"
                  value={ownerTxData.notes}
                  onChange={(e) => setOwnerTxData({ ...ownerTxData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOwnerModalOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg border hover:bg-muted"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOwnerTx}
                  className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmittingOwnerTx ? "পোস্ট হচ্ছে..." : "দাখিলা সম্পন্ন করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
