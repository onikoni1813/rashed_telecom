"use client";

import React, { useState } from "react";
import { formatBDT, formatDhakaDate } from "@/lib/i18n";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Building,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from "lucide-react";

export interface PnLData {
  revenue: {
    productSales: number;
    serviceRevenue: number;
    totalRevenue: number;
  };
  directCosts: {
    cogs: number;
    directServiceCosts: number;
    totalDirectCosts: number;
  };
  grossProfit: number;
  operatingExpenses: {
    rentUtilities: number;
    salariesCommissions: number;
    otherOperatingExpenses: number;
    totalOperatingExpenses: number;
  };
  netProfit: number;
  startDate: string | null;
  endDate: string;
}

export interface CashbookLine {
  id: string;
  date: string;
  sourceType: string;
  description: string | null;
  debit: number;
  credit: number;
}

export interface CashbookData {
  cashBalance: number;
  bankBalance: number;
  totalLiquidFunds: number;
  cashLines: CashbookLine[];
  bankLines: CashbookLine[];
}

export interface ReconciliationData {
  inventory: {
    subledgerValue: number;
    glAccountValue: number;
    difference: number;
    isReconciled: boolean;
  };
  receivables: {
    subledgerValue: number;
    glAccountValue: number;
    difference: number;
    isReconciled: boolean;
  };
  payables: {
    subledgerValue: number;
    glAccountValue: number;
    difference: number;
    isReconciled: boolean;
  };
  cashAndBank: {
    glCash: number;
    glBank: number;
    totalLiquid: number;
  };
}

interface ReportsViewProps {
  pnl: PnLData;
  cashbook: CashbookData;
  reconciliation: ReconciliationData;
}

export function ReportsView({ pnl, cashbook, reconciliation }: ReportsViewProps) {
  const [activeTab, setActiveTab] = useState<"PNL" | "CASHBOOK" | "RECONCILIATION">("PNL");

  const grossMarginPercent =
    pnl.revenue.totalRevenue > 0
      ? ((pnl.grossProfit / pnl.revenue.totalRevenue) * 100).toFixed(1)
      : "0.0";

  const netMarginPercent =
    pnl.revenue.totalRevenue > 0
      ? ((pnl.netProfit / pnl.revenue.totalRevenue) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      {/* Elevated Command Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-r from-card/90 via-card/60 to-card/90 p-6 sm:p-7 backdrop-blur-xl shadow-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 ring-2 ring-white/10 shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  আর্থিক প্রতিবেদন ও হিসাব বিবরণী
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                  P&L • Cashbook • Subledger
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                ব্যবসায়িক আয়-ব্যয়, নিট লাভ, ক্যাশ বুক খতিয়ান ও সাবলেজার রিকনসিলিয়েশন স্টেটমেন্ট
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Pill Tabs Bar */}
      <div className="glass-panel p-1.5 rounded-2xl border border-border/60 backdrop-blur-xl flex items-center gap-2 overflow-x-auto shadow-md">
        <button
          onClick={() => setActiveTab("PNL")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "PNL"
              ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md shadow-emerald-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>লাভ-ক্ষতির হিসাব (Profit & Loss)</span>
        </button>

        <button
          onClick={() => setActiveTab("CASHBOOK")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "CASHBOOK"
              ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md shadow-emerald-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>ক্যাশ বুক ও লিকুইডিটি (Cashbook)</span>
        </button>

        <button
          onClick={() => setActiveTab("RECONCILIATION")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "RECONCILIATION"
              ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md shadow-emerald-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>সাবলেজার রিকনসিলিয়েশন (Audit)</span>
        </button>
      </div>

      {/* TAB 1: PROFIT & LOSS */}
      {activeTab === "PNL" && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-border/50 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                সর্বমোট আয় (Revenue)
              </span>
              <div className="mt-2 text-2xl sm:text-3xl font-black text-foreground font-mono">
                {formatBDT(pnl.revenue.totalRevenue)}
              </div>
              <span className="text-[11px] text-muted-foreground mt-1.5 block font-medium">
                পণ্য বিক্রয় + সার্ভিসিং রাজস্ব
              </span>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-border/50 hover:border-rose-500/40 hover:shadow-xl hover:shadow-rose-500/5 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-rose-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                প্রত্যক্ষ খরচ (Direct Costs)
              </span>
              <div className="mt-2 text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
                {formatBDT(pnl.directCosts.totalDirectCosts)}
              </div>
              <span className="text-[11px] text-muted-foreground mt-1.5 block font-medium">
                COGS + যন্ত্রাংশ ও সার্ভিস খরচ
              </span>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-border/50 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                মোট লাভ (Gross Profit)
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatBDT(pnl.grossProfit)}
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  {grossMarginPercent}%
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-1.5 block font-medium">
                মোট লাভের মার্জিন
              </span>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-border/50 hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                নিট লাভ (Net Profit)
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span
                  className={`text-2xl sm:text-3xl font-black font-mono ${
                    pnl.netProfit >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {formatBDT(pnl.netProfit)}
                </span>
                <span className="text-xs font-bold bg-muted/60 border border-border/60 px-2.5 py-0.5 rounded-full">
                  {netMarginPercent}% নিট
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-1.5 block font-medium">
                পরিচালন ব্যয় পরবর্তী নিট মুনাফা
              </span>
            </div>
          </div>

          {/* Detailed Statement Table */}
          <div className="bg-card rounded-xl border shadow-xs p-6 space-y-6">
            <h2 className="text-lg font-bold text-foreground border-b pb-3 flex items-center justify-between">
              <span>আয় ও ব্যয়ের পূর্ণাঙ্গ বিবরণী (Income Statement)</span>
              <span className="text-xs font-normal text-muted-foreground">মুদ্রা: BDT (৳)</span>
            </h2>

            {/* 1. REVENUE SECTION */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase text-primary tracking-wider">
                ১. ব্যবসায়িক আয় (Revenue)
              </div>
              <div className="divide-y text-sm">
                <div className="flex justify-between py-2 pl-4">
                  <span className="text-muted-foreground">পণ্য বিক্রয় আয় (Product Sales 4000)</span>
                  <span className="font-mono font-medium">
                    {formatBDT(pnl.revenue.productSales)}
                  </span>
                </div>
                <div className="flex justify-between py-2 pl-4">
                  <span className="text-muted-foreground">মোবাইল সার্ভিসিং আয় (Service Revenue 4100)</span>
                  <span className="font-mono font-medium">
                    {formatBDT(pnl.revenue.serviceRevenue)}
                  </span>
                </div>
                <div className="flex justify-between py-2.5 font-bold text-foreground bg-muted/20 px-2 rounded-sm">
                  <span>মোট বিক্রয় ও সার্ভিস আয় (Total Revenue):</span>
                  <span className="font-mono">{formatBDT(pnl.revenue.totalRevenue)}</span>
                </div>
              </div>
            </div>

            {/* 2. DIRECT COSTS SECTION */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase text-rose-600 tracking-wider">
                ২. প্রত্যক্ষ খরচ (Cost of Goods & Direct Service Costs)
              </div>
              <div className="divide-y text-sm">
                <div className="flex justify-between py-2 pl-4">
                  <span className="text-muted-foreground">বিক্রিত পণ্যের ব্যয় (COGS 5000)</span>
                  <span className="font-mono font-medium text-rose-600">
                    {formatBDT(pnl.directCosts.cogs)}
                  </span>
                </div>
                <div className="flex justify-between py-2 pl-4">
                  <span className="text-muted-foreground">সার্ভিসিং পার্টস ও লেবার খরচ (Direct Service 5100)</span>
                  <span className="font-mono font-medium text-rose-600">
                    {formatBDT(pnl.directCosts.directServiceCosts)}
                  </span>
                </div>
                <div className="flex justify-between py-2.5 font-bold text-rose-600 bg-rose-50/50 dark:bg-rose-950/20 px-2 rounded-sm">
                  <span>মোট প্রত্যক্ষ খরচ (Total Direct Costs):</span>
                  <span className="font-mono">{formatBDT(pnl.directCosts.totalDirectCosts)}</span>
                </div>
              </div>
            </div>

            {/* GROSS PROFIT ROW */}
            <div className="flex justify-between items-center py-3 px-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 font-bold text-base text-emerald-700 dark:text-emerald-400">
              <span>মোট লাভ (Gross Profit = Revenue - Direct Costs):</span>
              <span className="font-mono text-lg">{formatBDT(pnl.grossProfit)}</span>
            </div>

            {/* 3. OPERATING EXPENSES */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase text-amber-600 tracking-wider">
                ৩. পরিচালনা ও সাধারণ ব্যয় (Operating Expenses)
              </div>
              <div className="divide-y text-sm">
                <div className="flex justify-between py-2 pl-4">
                  <span className="text-muted-foreground">দোকান ভাড়া ও বিদ্যুৎ বিল (Rent & Utilities 6000)</span>
                  <span className="font-mono font-medium">
                    {formatBDT(pnl.operatingExpenses.rentUtilities)}
                  </span>
                </div>
                <div className="flex justify-between py-2 pl-4">
                  <span className="text-muted-foreground">বেতন ও কমিশন (Salaries & Commissions 6100)</span>
                  <span className="font-mono font-medium">
                    {formatBDT(pnl.operatingExpenses.salariesCommissions)}
                  </span>
                </div>
                <div className="flex justify-between py-2 pl-4">
                  <span className="text-muted-foreground">অন্যান্য অপারেটিং খরচ (Other Operating 6200)</span>
                  <span className="font-mono font-medium">
                    {formatBDT(pnl.operatingExpenses.otherOperatingExpenses)}
                  </span>
                </div>
                <div className="flex justify-between py-2.5 font-bold text-foreground bg-muted/20 px-2 rounded-sm">
                  <span>মোট পরিচালনা ব্যয় (Total Operating Expenses):</span>
                  <span className="font-mono">
                    {formatBDT(pnl.operatingExpenses.totalOperatingExpenses)}
                  </span>
                </div>
              </div>
            </div>

            {/* NET PROFIT FINAL ROW */}
            <div className="flex justify-between items-center py-4 px-5 rounded-xl bg-primary text-primary-foreground font-bold text-lg shadow-sm">
              <span>নিট লাভ / ক্ষতি (Net Profit = Gross Profit - Operating Expenses):</span>
              <span className="font-mono text-xl">{formatBDT(pnl.netProfit)}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CASHBOOK */}
      {activeTab === "CASHBOOK" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card p-5 rounded-xl border shadow-xs">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                হাতে নগদ ব্যালেন্স (Cash on Hand 1000)
              </span>
              <div className="mt-2 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatBDT(cashbook.cashBalance)}
              </div>
            </div>

            <div className="bg-card p-5 rounded-xl border shadow-xs">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                ব্যাংক ও এমএফএস ব্যালেন্স (Bank/MFS 1010)
              </span>
              <div className="mt-2 text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                {formatBDT(cashbook.bankBalance)}
              </div>
            </div>

            <div className="bg-card p-5 rounded-xl border shadow-xs">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                সর্বমোট তরল তহবিল (Total Liquid Funds)
              </span>
              <div className="mt-2 text-2xl font-bold font-mono text-foreground">
                {formatBDT(cashbook.totalLiquidFunds)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CASH LINES */}
            <div className="bg-card rounded-xl border shadow-xs p-5 space-y-4">
              <h3 className="font-bold text-sm text-foreground flex items-center justify-between pb-2 border-b">
                <span>ক্যাশ খতিয়ান (Cash on Hand Ledger)</span>
                <span className="text-xs font-mono font-semibold text-emerald-600">
                  জের: {formatBDT(cashbook.cashBalance)}
                </span>
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {cashbook.cashLines.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    কোন ক্যাশ লেনদেন পাওয়া যায়নি।
                  </div>
                ) : (
                  cashbook.cashLines.map((l) => (
                    <div
                      key={l.id}
                      className="p-2.5 rounded-lg border text-xs flex items-center justify-between hover:bg-muted/20"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-medium text-foreground truncate">{l.description}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatDhakaDate(new Date(l.date))} • {l.sourceType}
                        </div>
                      </div>
                      <div className="text-right font-mono shrink-0">
                        {l.debit > 0 && (
                          <div className="text-emerald-600 font-bold">+ {formatBDT(l.debit)}</div>
                        )}
                        {l.credit > 0 && (
                          <div className="text-rose-600 font-bold">- {formatBDT(l.credit)}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* BANK LINES */}
            <div className="bg-card rounded-xl border shadow-xs p-5 space-y-4">
              <h3 className="font-bold text-sm text-foreground flex items-center justify-between pb-2 border-b">
                <span>ব্যাংক ও এমএফএস খতিয়ান (Bank/MFS Ledger)</span>
                <span className="text-xs font-mono font-semibold text-blue-600">
                  জের: {formatBDT(cashbook.bankBalance)}
                </span>
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {cashbook.bankLines.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    কোন ব্যাংক বা এমএফএস লেনদেন নেই।
                  </div>
                ) : (
                  cashbook.bankLines.map((l) => (
                    <div
                      key={l.id}
                      className="p-2.5 rounded-lg border text-xs flex items-center justify-between hover:bg-muted/20"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-medium text-foreground truncate">{l.description}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatDhakaDate(new Date(l.date))} • {l.sourceType}
                        </div>
                      </div>
                      <div className="text-right font-mono shrink-0">
                        {l.debit > 0 && (
                          <div className="text-emerald-600 font-bold">+ {formatBDT(l.debit)}</div>
                        )}
                        {l.credit > 0 && (
                          <div className="text-rose-600 font-bold">- {formatBDT(l.credit)}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RECONCILIATION */}
      {activeTab === "RECONCILIATION" && (
        <div className="space-y-6">
          <div className="bg-card p-5 rounded-xl border shadow-xs">
            <h2 className="text-base font-bold text-foreground">
              সাবলেজার ও জেনারেল লেজার মিলকরণ (Audit Reconciliation Report)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              মজুদ পণ্যের মূল্য, গ্রাহক বকেয়া ও সরবরাহকারীর পাওনা জেনারেল লেজারের সাথে স্বয়ংক্রিয়ভাবে সমন্বিত রয়েছে কিনা তা যাচাই করুন।
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* INVENTORY */}
            <div className="bg-card rounded-xl border shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="font-bold text-sm text-foreground">মজুদ পণ্যের মূল্য (Stock Valuation)</span>
                {reconciliation.inventory.isReconciled ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold">
                    মিলের হার ১০০%
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold">
                    অমিল রয়েছে
                  </span>
                )}
              </div>
              <div className="text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ইনভেন্টরি সাবলেজার:</span>
                  <span className="font-mono font-semibold">
                    {formatBDT(reconciliation.inventory.subledgerValue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">অ্যাকাউন্ট ১২০০ (GL Balance):</span>
                  <span className="font-mono font-semibold">
                    {formatBDT(reconciliation.inventory.glAccountValue)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold">
                  <span>পার্থক্য (Variance):</span>
                  <span className="font-mono">
                    {formatBDT(reconciliation.inventory.difference)}
                  </span>
                </div>
              </div>
            </div>

            {/* RECEIVABLES */}
            <div className="bg-card rounded-xl border shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="font-bold text-sm text-foreground">গ্রাহক বকেয়া (Customer Dues)</span>
                {reconciliation.receivables.isReconciled ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold">
                    মিলের হার ১০০%
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold">
                    অমিল রয়েছে
                  </span>
                )}
              </div>
              <div className="text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">গ্রাহক সাবলেজার জের:</span>
                  <span className="font-mono font-semibold">
                    {formatBDT(reconciliation.receivables.subledgerValue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">অ্যাকাউন্ট ১১০০ (GL Balance):</span>
                  <span className="font-mono font-semibold">
                    {formatBDT(reconciliation.receivables.glAccountValue)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold">
                  <span>পার্থক্য (Variance):</span>
                  <span className="font-mono">
                    {formatBDT(reconciliation.receivables.difference)}
                  </span>
                </div>
              </div>
            </div>

            {/* PAYABLES */}
            <div className="bg-card rounded-xl border shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="font-bold text-sm text-foreground">সরবরাহকারী পাওনা (Payables)</span>
                {reconciliation.payables.isReconciled ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold">
                    মিলের হার ১০০%
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold">
                    অমিল রয়েছে
                  </span>
                )}
              </div>
              <div className="text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">সরবরাহকারী সাবলেজার জের:</span>
                  <span className="font-mono font-semibold">
                    {formatBDT(reconciliation.payables.subledgerValue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">অ্যাকাউন্ট ২০০০ (GL Balance):</span>
                  <span className="font-mono font-semibold">
                    {formatBDT(reconciliation.payables.glAccountValue)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold">
                  <span>পার্থক্য (Variance):</span>
                  <span className="font-mono">
                    {formatBDT(reconciliation.payables.difference)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
