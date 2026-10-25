"use client";

import React, { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingCart,
  Wrench,
  Package,
  Receipt,
  Users,
  AlertCircle,
  FileText,
  ShieldCheck,
  Settings,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Database,
  DollarSign,
  ChevronRight,
  RefreshCw,
  Layers,
  Smartphone,
  Zap,
  Calendar,
  Printer,
  PieChart,
  BarChart3,
  Award,
  CreditCard,
  X,
  ChevronDown,
} from "lucide-react";
import { formatBDT } from "@/lib/i18n";
import {
  AnalyticsPeriod,
  PerformanceAnalyticsResult,
} from "./analytics-service";
import { fetchPerformanceAnalyticsAction } from "./actions";

export interface DashboardMetricData {
  shopName: string;
  currency: string;
  timezone: string;
  activeCashSession: {
    status: string;
    openingCash: number;
    cashierName: string;
    openingTime: string;
  } | null;
  todaySalesTotal: number;
  todaySalesCount: number;
  activeRepairCount: number;
  totalCustomerDues: number;
  dueCustomersCount: number;
  todayExpenseTotal: number;
  activeServiceJobs: Array<{
    id: string;
    jobNumber: string;
    deviceBrand: string;
    deviceModel: string;
    reportedIssue: string;
    status: string;
    customerName: string;
    customerPhone: string;
    technicianName: string;
    estimatedCost: number;
    totalAmount: number;
    createdAt: string;
  }>;
  recentSales: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    totalAmount: number;
    paymentStatus: string;
    itemCount: number;
    createdAt: string;
  }>;
  lowStockProducts: Array<{
    id: string;
    name: string;
    categoryName: string;
    quantityOnHand: number;
    minStockAlert: number;
    sellingPrice: number;
  }>;
}

interface DashboardViewProps {
  data: DashboardMetricData;
  initialAnalytics?: PerformanceAnalyticsResult | null;
  shopId?: string;
}

export function DashboardView({
  data,
  initialAnalytics,
  shopId = "11111111-1111-1111-1111-111111111111",
}: DashboardViewProps) {
  const [timeStr, setTimeStr] = useState<string>("");
  const [greeting, setGreeting] = useState<string>("স্বাগতম");

  // Filter State
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>(
    initialAnalytics?.period || "today"
  );
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [analytics, setAnalytics] = useState<PerformanceAnalyticsResult | null>(
    initialAnalytics || null
  );
  const [isPending, startTransition] = useTransition();

  // Active Tab in Analytics Drilldown
  const [activeTab, setActiveTab] = useState<"top-products" | "expenses" | "payments" | "trend">("top-products");
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Dynamic live clock and contextual greeting
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          timeZone: "Asia/Dhaka",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );

      const hour = parseInt(
        now.toLocaleTimeString("en-US", {
          timeZone: "Asia/Dhaka",
          hour: "2-digit",
          hour12: false,
        }),
        10
      );

      if (hour >= 4 && hour < 12) {
        setGreeting("শুভ সকাল, রাশেদ ভাই! 🌅");
      } else if (hour >= 12 && hour < 16) {
        setGreeting("শুভ দুপুর, রাশেদ ভাই! ☀️");
      } else if (hour >= 16 && hour < 19) {
        setGreeting("শুভ অপরাহ্ন, রাশেদ ভাই! 🌤️");
      } else if (hour >= 19 && hour < 24) {
        setGreeting("শুভ সন্ধ্যা, রাশেদ ভাই! 🌙");
      } else {
        setGreeting("শুভ রাত্রি, রাশেদ ভাই! ✨");
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Analytics on filter selection
  const handlePeriodChange = (period: AnalyticsPeriod) => {
    setSelectedPeriod(period);
    if (period !== "custom") {
      startTransition(async () => {
        try {
          const res = await fetchPerformanceAnalyticsAction(shopId, period);
          setAnalytics(res);
        } catch (err) {
          console.error("Failed to load analytics:", err);
        }
      });
    }
  };

  const handleApplyCustomFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStartDate) return;
    startTransition(async () => {
      try {
        const res = await fetchPerformanceAnalyticsAction(
          shopId,
          "custom",
          customStartDate,
          customEndDate || customStartDate
        );
        setAnalytics(res);
      } catch (err) {
        console.error("Failed to load custom analytics:", err);
      }
    });
  };

  // Fallback initial values if analytics is not loaded yet
  const currentSalesTotal = analytics ? analytics.sales.totalRevenue : data.todaySalesTotal;
  const currentSalesItems = analytics ? analytics.sales.totalQuantitySold : 0;
  const currentSalesProfit = analytics ? analytics.sales.grossProfit : 0;
  const currentSalesMargin = analytics ? analytics.sales.profitMarginPercent : 0;

  const currentServiceRev = analytics ? analytics.service.totalRevenue : 0;
  const currentServiceDelivered = analytics ? analytics.service.deliveredJobsCount : 0;
  const currentServiceProfit = analytics ? analytics.service.netProfit : 0;
  const currentServiceMargin = analytics ? analytics.service.profitMarginPercent : 0;

  const currentExpenseTotal = analytics ? analytics.expenses.totalAmount : data.todayExpenseTotal;
  const currentExpenseCount = analytics ? analytics.expenses.totalCount : 0;

  const currentNetProfit = analytics
    ? analytics.bottomLine.netBusinessProfit
    : currentSalesProfit + currentServiceProfit - currentExpenseTotal;
  const currentNetMargin = analytics ? analytics.bottomLine.netMarginPercent : 0;
  const isProfitable = currentNetProfit >= 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-32 lg:pb-12 animate-in fade-in duration-300">
      {/* 1. COMMAND CENTER HERO WITH AMBIENT GRADIENTS & LIVE OS CONTROLS */}
      <div className="relative overflow-hidden rounded-3xl border border-white/60 dark:border-white/10 glass-panel p-6 sm:p-8 shadow-2xl">
        {/* Ambient Neon Glow Orbs */}
        <div className="absolute -top-28 -right-28 w-96 h-96 rounded-full bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/10 blur-3xl pointer-events-none animate-pulse-subtle" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-tr from-cyan-400/20 via-emerald-400/15 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            {/* Logo Badge with Glowing Outer Ring */}
            <div className="relative group shrink-0">
              <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-400 opacity-70 blur-sm group-hover:opacity-100 transition duration-300" />
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white/50 dark:border-white/20 bg-background shadow-xl flex items-center justify-center">
                <Image
                  src="/invoice_logo.jpg"
                  alt="Rashed Telecom"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground bg-gradient-to-r from-foreground via-foreground/90 to-foreground/75 bg-clip-text">
                  {greeting}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  সেন্ট্রাল কমান্ড সেন্টার • লাইভ
                </span>
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                <span className="text-foreground font-semibold">রাশেদ টেলিকম</span> — আধুনিক সেলস, ইনভেন্টরি ও মোবাইল সার্ভিসিং ল্যাব ওএস
              </p>

              {/* Status Pills Strip */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
                {/* Live Clock Pill */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-background/80 border border-border/80 font-mono font-bold text-foreground shadow-xs">
                  <Clock className="w-3.5 h-3.5 text-primary animate-spin-slow" />
                  <span>{timeStr || "ঢাকা সময়"}</span>
                </div>

                {/* Cash Session Status Pill */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>
                    ক্যাশ রেজিস্টার: {data.activeCashSession?.status === "OPEN" ? "খোলা (৳৫,০০০)" : "বন্ধ"}
                  </span>
                </div>

                {/* Database Engine Pill */}
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs">
                  <Database className="w-3.5 h-3.5" />
                  <span>PostgreSQL 18 • Dexie Sync</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Primary Actions */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <Link
              href="/app/pos"
              className="flex-1 sm:flex-initial relative group overflow-hidden flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-extrabold text-white rounded-2xl shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95 transition-all shimmer-button"
            >
              <ShoppingCart className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span>POS বিক্রয় কেন্দ্র (F1)</span>
            </Link>
            <Link
              href="/app/service"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-extrabold text-foreground bg-card/90 hover:bg-card border-2 border-primary/20 hover:border-primary/40 rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition-all"
            >
              <Wrench className="w-5 h-5 text-primary" />
              <span>সার্ভিসিং গ্রহণ (F2)</span>
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. INTERACTIVE TIMEFRAME FILTER BAR (প্রতিদিনের, সপ্তাহের, মাসের ও বাত্সরিক)
         ========================================================================= */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-border/80 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-foreground">
                  ব্যবসায়িক ফিল্টার ও লাভ বিশ্লেষণ
                </h2>
                {isPending && (
                  <span className="inline-flex items-center gap-1 text-xs text-primary font-bold animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    হিসাব আপডেট হচ্ছে...
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics?.periodLabel || "আজকের সেলস, সার্ভিস ও খরচের লাইভ মেট্রিক্স"}
              </p>
            </div>
          </div>

          {/* Timeframe Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-muted/40 rounded-2xl border border-border/60">
            <button
              onClick={() => handlePeriodChange("today")}
              disabled={isPending}
              className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 ${
                selectedPeriod === "today"
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/80"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>আজকে</span>
            </button>

            <button
              onClick={() => handlePeriodChange("week")}
              disabled={isPending}
              className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 ${
                selectedPeriod === "week"
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/80"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>এই সপ্তাহ</span>
            </button>

            <button
              onClick={() => handlePeriodChange("month")}
              disabled={isPending}
              className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 ${
                selectedPeriod === "month"
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/80"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>এই মাস</span>
            </button>

            <button
              onClick={() => handlePeriodChange("year")}
              disabled={isPending}
              className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 ${
                selectedPeriod === "year"
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/80"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>বাত্সরিক</span>
            </button>

            <button
              onClick={() => setSelectedPeriod("custom")}
              disabled={isPending}
              className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 ${
                selectedPeriod === "custom"
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/80"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>কাস্টম তারিখ</span>
            </button>

            <button
              onClick={() => handlePeriodChange(selectedPeriod)}
              disabled={isPending}
              title="পুনরায় লোড করুন"
              className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-background transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin text-primary" : ""}`} />
            </button>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3 py-2 text-xs font-bold text-foreground bg-card hover:bg-card/80 border border-border/80 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">রিপোর্ট স্লিপ</span>
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker Form (when custom is selected) */}
        {selectedPeriod === "custom" && (
          <form
            onSubmit={handleApplyCustomFilter}
            className="pt-3 border-t border-border/60 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-center gap-2">
              <label htmlFor="start-date-input" className="text-xs font-bold text-muted-foreground">শুরুর তারিখ:</label>
              <input
                id="start-date-input"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                required
                className="px-3 py-1.5 text-xs font-semibold bg-background border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="end-date-input" className="text-xs font-bold text-muted-foreground">শেষের তারিখ:</label>
              <input
                id="end-date-input"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-background border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <button
              type="submit"
              disabled={isPending || !customStartDate}
              className="px-4 py-1.5 text-xs font-extrabold text-white bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              ফিল্টার প্রয়োগ করুন
            </button>
          </form>
        )}
      </div>

      {/* =========================================================================
          3. FOUR CORE PERFORMANCE & PROFIT CARDS (সেলস, সার্ভিস, খরচ ও নিট লাভ)
         ========================================================================= */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 transition-opacity duration-300 ${isPending ? "opacity-60" : "opacity-100"}`}>
        
        {/* CARD 1: SALES, PRODUCTS SOLD & GROSS PROFIT */}
        <div className="glass-card p-6 rounded-3xl relative overflow-hidden group border border-border/70 hover:border-blue-500/50 shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/25 transition-all duration-300 pointer-events-none" />
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5 text-blue-500" />
              ১। সেলস ও পণ্য লাভ
            </span>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                {formatBDT(currentSalesTotal)}
              </div>
              <p className="text-xs font-semibold text-muted-foreground pt-0.5">
                মোট বিক্রয় মূল্য ({analytics?.periodLabel || "সিলেক্টেড পিরিয়ড"})
              </p>
            </div>

            {/* Sub-metrics Strip */}
            <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-blue-500" />
                  বিক্রিত পণ্যের সংখ্যা:
                </span>
                <span className="font-extrabold text-foreground bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-lg border border-blue-500/20">
                  {currentSalesItems} টি আইটেম
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  পণ্যে মোট লাভ:
                </span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  {formatBDT(currentSalesProfit)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[11px] text-muted-foreground">
                  গ্রস মার্জিন: <strong className="text-foreground">{currentSalesMargin}%</strong>
                </span>
                <Link
                  href="/app/sales"
                  className="text-[11px] text-primary hover:underline font-bold flex items-center gap-0.5"
                >
                  ইনভয়েস খাতা <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: SERVICING JOBS & SERVICE PROFIT */}
        <div className="glass-card p-6 rounded-3xl relative overflow-hidden group border border-border/70 hover:border-amber-500/50 shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/25 transition-all duration-300 pointer-events-none" />
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-amber-500" />
              ২। সার্ভিসিং ও মেরামত লাভ
            </span>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                {formatBDT(currentServiceRev)}
              </div>
              <p className="text-xs font-semibold text-muted-foreground pt-0.5">
                মোট সার্ভিসিং আয় (বিল সংগ্রহ)
              </p>
            </div>

            {/* Sub-metrics Strip */}
            <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  সার্ভিসকৃত ডিভাইস:
                </span>
                <span className="font-extrabold text-foreground bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-lg border border-amber-500/20">
                  {currentServiceDelivered} টি সম্পন্ন
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  সার্ভিসে নিট লাভ:
                </span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  {formatBDT(currentServiceProfit)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[11px] text-muted-foreground">
                  সার্ভিস মার্জিন: <strong className="text-foreground">{currentServiceMargin}%</strong>
                </span>
                <Link
                  href="/app/service"
                  className="text-[11px] text-primary hover:underline font-bold flex items-center gap-0.5"
                >
                  রিপেয়ার বোর্ড <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: OPERATING EXPENSES */}
        <div className="glass-card p-6 rounded-3xl relative overflow-hidden group border border-border/70 hover:border-rose-500/50 shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/25 transition-all duration-300 pointer-events-none" />
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-rose-500" />
              ৩। ব্যবসায়িক খরচ
            </span>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                {formatBDT(currentExpenseTotal)}
              </div>
              <p className="text-xs font-semibold text-muted-foreground pt-0.5">
                দোকান পরিচালনা ও দৈনন্দিন ব্যয়
              </p>
            </div>

            {/* Sub-metrics Strip */}
            <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                  ভাউচার সংখ্যা:
                </span>
                <span className="font-extrabold text-foreground bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-lg border border-rose-500/20">
                  {currentExpenseCount} টি খরচ
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  প্রধান খাত:
                </span>
                <span className="font-bold text-foreground truncate max-w-[120px]">
                  {analytics?.expenses.categoryBreakdown[0]?.categoryName || "সাধারণ খরচ"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[11px] text-muted-foreground">
                  খাত: <strong>{analytics?.expenses.categoryBreakdown.length || 0} টি</strong>
                </span>
                <Link
                  href="/app/expenses"
                  className="text-[11px] text-primary hover:underline font-bold flex items-center gap-0.5"
                >
                  খরচের খাতা <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 4: OVERALL BUSINESS NET PROFIT (THE BOTTOM LINE HERO CARD) */}
        <div
          className={`glass-card p-6 rounded-3xl relative overflow-hidden group border shadow-xl transition-all ${
            isProfitable
              ? "border-emerald-500/40 hover:border-emerald-500/70 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent"
              : "border-rose-500/40 hover:border-rose-500/70 bg-gradient-to-b from-rose-500/5 via-transparent to-transparent"
          }`}
        >
          <div
            className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl transition-all duration-300 pointer-events-none ${
              isProfitable ? "bg-emerald-500/15 group-hover:bg-emerald-500/30" : "bg-rose-500/15 group-hover:bg-rose-500/30"
            }`}
          />

          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-500" />
              ৪। ব্যবসায়িক চূড়ান্ত নিট লাভ
            </span>
            <div
              className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform ${
                isProfitable
                  ? "bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-emerald-500/30"
                  : "bg-gradient-to-tr from-rose-500 to-red-600 shadow-rose-500/30"
              }`}
            >
              {isProfitable ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <div
                className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  isProfitable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatBDT(currentNetProfit)}
              </div>
              <p className="text-xs font-semibold text-muted-foreground pt-0.5">
                (সেলস লাভ + সার্ভিস লাভ) - মোট খরচ
              </p>
            </div>

            {/* Bottom-line Breakdown Strip */}
            <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">নিট লাভ মার্জিন:</span>
                <span
                  className={`font-black px-2 py-0.5 rounded-lg border text-xs ${
                    isProfitable
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                  }`}
                >
                  {isProfitable ? `+${currentNetMargin}%` : `${currentNetMargin}%`}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>মোট ব্যবসায়ের আয়:</span>
                <span className="font-bold text-foreground">
                  {formatBDT(analytics?.bottomLine.totalBusinessRevenue || currentSalesTotal + currentServiceRev)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                  {isProfitable ? "✅ প্রতিষ্ঠানটি লাভজনক" : "⚠️ খরচের হার বেশি"}
                </span>
                <button
                  onClick={() => setIsPrintModalOpen(true)}
                  className="text-[11px] text-primary hover:underline font-bold flex items-center gap-0.5"
                >
                  পূর্ণাঙ্গ স্লিপ <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* =========================================================================
          4. INTERACTIVE ANALYTICS DRILLDOWN HUB (টপ-সেলিং প্রডাক্ট, খরচ ও পেমেন্ট)
         ========================================================================= */}
      <div className="glass-panel rounded-3xl border border-border/80 shadow-2xl overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="text-sm sm:text-base font-black text-foreground">
              গভীর বিশ্লেষণ ও খাতভিত্তিক রিপোর্ট ({analytics?.periodLabel || "আজকে"})
            </h3>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-background/80 rounded-2xl border border-border/60 text-xs">
            <button
              onClick={() => setActiveTab("top-products")}
              className={`px-3 py-1.5 font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "top-products"
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>টপ ৫ পণ্য ও লাভ</span>
            </button>

            <button
              onClick={() => setActiveTab("expenses")}
              className={`px-3 py-1.5 font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "expenses"
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>খরচের খাত</span>
            </button>

            <button
              onClick={() => setActiveTab("payments")}
              className={`px-3 py-1.5 font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "payments"
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>পেমেন্ট মাধ্যম</span>
            </button>
          </div>
        </div>

        {/* Tab Content 1: Top 5 Best Selling Products */}
        {activeTab === "top-products" && (
          <div className="p-4 sm:p-6 space-y-4 animate-in fade-in duration-200">
            {(!analytics?.topProducts || analytics.topProducts.length === 0) ? (
              <div className="text-center py-10 text-muted-foreground text-xs space-y-2">
                <Package className="w-10 h-10 mx-auto opacity-40" />
                <p>এই সময়কালে কোনো পণ্য বিক্রির রেকর্ড পাওয়া যায়নি।</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground uppercase text-[11px] font-bold">
                      <th className="pb-3 px-3">র‍্যাংক ও পণ্য</th>
                      <th className="pb-3 px-3">ক্যাটাগরি</th>
                      <th className="pb-3 px-3 text-center">বিক্রিত সংখ্যা</th>
                      <th className="pb-3 px-3 text-right">মোট বিক্রি (৳)</th>
                      <th className="pb-3 px-3 text-right">পণ্য খরচ (৳)</th>
                      <th className="pb-3 px-3 text-right">অর্জিত লাভ (৳)</th>
                      <th className="pb-3 px-3 text-right">লাভ মার্জিন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {analytics.topProducts.map((p, idx) => (
                      <tr key={p.productId} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="font-extrabold text-foreground">{p.productName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground font-medium">
                          {p.categoryName}
                        </td>
                        <td className="py-3 px-3 text-center font-black text-foreground">
                          <span className="px-2 py-1 rounded-lg bg-muted border border-border">
                            {p.quantitySold} টি
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-foreground">
                          {formatBDT(p.totalRevenue)}
                        </td>
                        <td className="py-3 px-3 text-right text-muted-foreground">
                          {formatBDT(p.totalCost)}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                          +{formatBDT(p.totalProfit)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                            {p.marginPercent}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 2: Operating Expense Breakdown */}
        {activeTab === "expenses" && (
          <div className="p-4 sm:p-6 space-y-4 animate-in fade-in duration-200">
            {(!analytics?.expenses.categoryBreakdown || analytics.expenses.categoryBreakdown.length === 0) ? (
              <div className="text-center py-10 text-muted-foreground text-xs space-y-2">
                <Receipt className="w-10 h-10 mx-auto opacity-40" />
                <p>এই সময়কালে কোনো খরচের রেকর্ড নেই।</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analytics.expenses.categoryBreakdown.map((c) => (
                  <div
                    key={c.categoryName}
                    className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">{c.categoryName}</span>
                      <span className="font-black text-rose-600 dark:text-rose-400">
                        {formatBDT(c.amount)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-border/60 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(c.percentage, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{c.count} টি ভাউচার</span>
                      <span className="font-semibold">মোট খরচের {c.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content 3: Payment Channel Split */}
        {activeTab === "payments" && (
          <div className="p-4 sm:p-6 space-y-4 animate-in fade-in duration-200">
            {(!analytics?.paymentBreakdown || analytics.paymentBreakdown.length === 0) ? (
              <div className="text-center py-10 text-muted-foreground text-xs space-y-2">
                <CreditCard className="w-10 h-10 mx-auto opacity-40" />
                <p>এই সময়কালে পেমেন্টের কোনো রেকর্ড নেই।</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {analytics.paymentBreakdown.map((pay) => (
                  <div
                    key={pay.method}
                    className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">{pay.methodLabel}</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-primary/10 text-primary">
                        {pay.percentage}%
                      </span>
                    </div>
                    <div className="text-xl font-black text-foreground">
                      {formatBDT(pay.amount)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      মোট লেনদেন: <strong className="text-foreground">{pay.count} টি</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          5. QUICK NAVIGATION COMMAND HUB (8 HIGH-IMPACT SHORTCUTS)
         ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            শপ কমান্ড হাব (Quick Operations Launcher)
          </span>
          <span className="text-xs text-muted-foreground font-semibold">৮টি দ্রুত অ্যাকশন</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
          <Link
            href="/app/pos"
            className="glass-card p-4 rounded-2xl flex flex-col items-center text-center gap-2.5 hover:border-blue-500/50 group active:scale-95 transition-all shadow-xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-foreground">POS কাউন্টার</span>
          </Link>

          <Link
            href="/app/service"
            className="glass-card p-4 rounded-2xl flex flex-col items-center text-center gap-2.5 hover:border-amber-500/50 group active:scale-95 transition-all shadow-xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <Wrench className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-foreground">সার্ভিসিং ল্যাব</span>
          </Link>

          <Link
            href="/app/products"
            className="glass-card p-4 rounded-2xl flex flex-col items-center text-center gap-2.5 hover:border-purple-500/50 group active:scale-95 transition-all shadow-xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <Package className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-foreground">পণ্য ও স্টক</span>
          </Link>

          <Link
            href="/app/statements"
            className="glass-card p-4 rounded-2xl flex flex-col items-center text-center gap-2.5 hover:border-emerald-500/50 group active:scale-95 transition-all shadow-xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-foreground">লেজার খাতা</span>
          </Link>

          <Link
            href="/app/expenses"
            className="glass-card p-4 rounded-2xl flex flex-col items-center text-center gap-2.5 hover:border-rose-500/50 group active:scale-95 transition-all shadow-xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <Receipt className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-foreground">দৈনিক খরচ</span>
          </Link>

          <Link
            href="/app/approvals"
            className="glass-card p-4 rounded-2xl flex flex-col items-center text-center gap-2.5 hover:border-indigo-500/50 group active:scale-95 transition-all shadow-xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-foreground">অনুমোদন কেন্দ্র</span>
          </Link>

          <Link
            href="/app/staff"
            className="glass-card p-4 rounded-2xl flex flex-col items-center text-center gap-2.5 hover:border-cyan-500/50 group active:scale-95 transition-all shadow-xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-foreground">স্টাফ ও বেতন</span>
          </Link>

          <Link
            href="/app/settings"
            className="glass-card p-4 rounded-2xl flex flex-col items-center text-center gap-2.5 hover:border-zinc-500/50 group active:scale-95 transition-all shadow-xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <Settings className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-foreground">শপ সেটিংস</span>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          6. MAIN TWO-COLUMN SPLIT: ACTIVE SERVICING BENCH & INVENTORY RADAR
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Active Servicing Bench (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-base font-bold text-foreground">
                মোবাইল সার্ভিসিং ল্যাব বেঞ্চ (Live Servicing Queue)
              </h2>
            </div>
            <Link
              href="/app/service"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              সকল কাজ দেখুন <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {data.activeServiceJobs.length === 0 ? (
            <div className="glass-panel p-8 rounded-3xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto text-muted-foreground">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-foreground">বর্তমানে কোনো অপেক্ষমান মেরামত কাজ নেই</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                নতুন কোনো কাস্টমার ডিভাইস আনলে সার্ভিসিং গ্রহণ বাটনে ক্লিক করে আইএমইআই ও সমস্যা লিপিবদ্ধ করুন।
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {data.activeServiceJobs.map((job) => (
                <div
                  key={job.id}
                  className="glass-card p-5 rounded-2xl border border-border/80 hover:border-primary/40 transition-all space-y-3.5 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-mono font-bold text-xs">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-foreground text-sm">
                            {job.deviceBrand} {job.deviceModel}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-muted text-muted-foreground border border-border">
                            #{job.jobNumber}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium line-clamp-1">
                          সমস্যা: {job.reportedIssue}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                        {job.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>কাস্টমার: <strong className="text-foreground">{job.customerName}</strong></span>
                      <span>•</span>
                      <span>টেকনিশিয়ান: <strong className="text-foreground">{job.technicianName}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-muted-foreground">বিল:</span>
                      <strong className="text-foreground font-black text-sm">
                        {formatBDT(job.totalAmount || job.estimatedCost)}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Low Stock Inventory Radar (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h2 className="text-base font-bold text-foreground">
                লো-স্টক ইনভেন্টরি সতর্কবার্তা (Alerts)
              </h2>
            </div>
            <Link
              href="/app/inventory"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              স্টক খাতা <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="glass-panel p-5 rounded-3xl border border-border/80 shadow-sm space-y-3">
            {data.lowStockProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs space-y-2">
                <Package className="w-8 h-8 mx-auto opacity-50" />
                <p>সব পণ্যের পর্যাপ্ত স্টক রয়েছে। কোনো ঘাটতি নেই।</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {data.lowStockProducts.map((prod) => (
                  <div key={prod.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-foreground block line-clamp-1">
                        {prod.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        ক্যাটাগরি: {prod.categoryName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-right shrink-0">
                      <div>
                        <span className="text-xs font-black text-rose-600 dark:text-rose-400 block">
                          স্টকে আছে: {prod.quantityOnHand} টি
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          মূল্য: {formatBDT(prod.sellingPrice)}
                        </span>
                      </div>
                      <Link
                        href="/app/purchases"
                        className="px-2.5 py-1 text-[11px] font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-all"
                      >
                        অর্ডার
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          7. PRINTABLE SUMMARY REPORT SLIP MODAL (রাশেদ টেলিকম স্টেটমেন্ট)
         ========================================================================= */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border border-border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-primary" />
                <h3 className="font-extrabold text-foreground">
                  ব্যবসায়িক স্টেটমেন্ট স্লিপ প্রিন্ট
                </h3>
              </div>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Area */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 font-mono text-xs space-y-3">
              <div className="text-center pb-2 border-b border-dashed border-border/80 space-y-0.5">
                <h4 className="font-black text-sm uppercase text-foreground">রাশেদ টেলিকম</h4>
                <p className="text-[11px] text-muted-foreground">
                  মোবাইল সেলস, রিপেয়ারিং ল্যাব ও অ্যাক্সেসরিজ
                </p>
                <p className="text-[11px] font-bold text-primary">
                  {analytics?.periodLabel || "আজকের রিপোর্ট"}
                </p>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>মোট বিক্রয় রেভিনিউ:</span>
                  <strong className="text-foreground">{formatBDT(currentSalesTotal)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>বিক্রিত পণ্যের সংখ্যা:</span>
                  <span>{currentSalesItems} টি</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>সেলসে অর্জিত লাভ:</span>
                  <strong>+{formatBDT(currentSalesProfit)}</strong>
                </div>

                <div className="border-t border-dashed border-border/60 pt-1.5 flex justify-between">
                  <span>মোট সার্ভিসিং আয়:</span>
                  <strong className="text-foreground">{formatBDT(currentServiceRev)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>সার্ভিসকৃত ডিভাইস:</span>
                  <span>{currentServiceDelivered} টি</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>সার্ভিসে নিট লাভ:</span>
                  <strong>+{formatBDT(currentServiceProfit)}</strong>
                </div>

                <div className="border-t border-dashed border-border/60 pt-1.5 flex justify-between text-rose-600 dark:text-rose-400">
                  <span>মোট দোকান খরচ:</span>
                  <strong>-{formatBDT(currentExpenseTotal)}</strong>
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>খরচ এন্ট্রি সংখ্যা:</span>
                  <span>{currentExpenseCount} টি ভাউচার</span>
                </div>

                <div className="border-t-2 border-border/80 pt-2 flex justify-between text-sm font-black">
                  <span>সর্বমোট নিট লাভ:</span>
                  <span className={isProfitable ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                    {formatBDT(currentNetProfit)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>নিট মার্জিন হার:</span>
                  <span>{currentNetMargin}%</span>
                </div>
              </div>

              <div className="text-center pt-2 border-t border-dashed border-border/80 text-[10px] text-muted-foreground">
                রিপোর্ট প্রস্তুতের সময়: {new Date().toLocaleString("bn-BD")}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
              >
                বাতিল
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 text-xs font-black text-white bg-primary hover:bg-primary/90 rounded-xl flex items-center gap-2 shadow-lg shadow-primary/25 active:scale-95 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>প্রিন্ট করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
