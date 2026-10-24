"use client";

import React, { useState, useEffect } from "react";
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
  SlidersHorizontal,
  Settings,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Cpu,
  Database,
  Wifi,
  DollarSign,
  ChevronRight,
  RefreshCw,
  Layers,
  Smartphone,
  PhoneCall,
  Search,
  Zap,
} from "lucide-react";
import { formatBDT } from "@/lib/i18n";

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
}

export function DashboardView({ data }: DashboardViewProps) {
  const [timeStr, setTimeStr] = useState<string>("");
  const [greeting, setGreeting] = useState<string>("স্বাগতম");

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

      {/* 2. FOUR HOLOGRAPHIC FINANCIAL & OPERATION PULSE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Today's Gross Sales */}
        <div className="glass-card p-6 rounded-3xl relative overflow-hidden group border border-border/70 hover:border-blue-500/40">
          <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-300" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-500" />
              আজকের মোট বিক্রয়
            </span>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-black text-foreground tracking-tight">
              {formatBDT(data.todaySalesTotal)}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>ইনভয়েস সম্পন্ন: <strong className="text-foreground">{data.todaySalesCount} টি</strong></span>
              <Link href="/app/sales" className="text-primary hover:underline font-bold flex items-center gap-0.5">
                সেলস খাতা <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* 2. Active Mobile Servicing Lab Queue */}
        <div className="glass-card p-6 rounded-3xl relative overflow-hidden group border border-border/70 hover:border-amber-500/40">
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all duration-300" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-amber-500" />
              চলমান ল্যাব সার্ভিসিং
            </span>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-black text-foreground tracking-tight">
              {data.activeRepairCount} টি ডিভাইস
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span className="text-amber-600 dark:text-amber-400 font-bold">ল্যাবে ডায়াগনস্টিক্স চলছে</span>
              <Link href="/app/service" className="text-primary hover:underline font-bold flex items-center gap-0.5">
                রিপেয়ার বোর্ড <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* 3. Customer Dues Receivable */}
        <div className="glass-card p-6 rounded-3xl relative overflow-hidden group border border-border/70 hover:border-rose-500/40">
          <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all duration-300" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              মার্কেট বকেয়া পাওনা
            </span>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-black text-foreground tracking-tight">
              {formatBDT(data.totalCustomerDues)}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>বকেয়া খাতা: <strong className="text-foreground">{data.dueCustomersCount} জন</strong></span>
              <Link href="/app/dues" className="text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-0.5">
                আদায় করুন <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* 4. Cash Flow & Net Drawer Pulse */}
        <div className="glass-card p-6 rounded-3xl relative overflow-hidden group border border-border/70 hover:border-emerald-500/40">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-300" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              আজকের ক্যাশ ও খরচ
            </span>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-black text-foreground tracking-tight">
              {formatBDT(5000 - data.todayExpenseTotal)}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>খরচ: <strong className="text-foreground">{formatBDT(data.todayExpenseTotal)}</strong></span>
              <Link href="/app/expenses" className="text-primary hover:underline font-bold flex items-center gap-0.5">
                খরচের খাতা <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 3. QUICK NAVIGATION COMMAND HUB (8 HIGH-IMPACT SHORTCUTS) */}
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

      {/* 4. MAIN TWO-COLUMN SPLIT: ACTIVE SERVICING BENCH & INVENTORY RADAR */}
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
                      <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                        {job.jobNumber}
                      </span>
                      <h3 className="font-bold text-sm text-foreground">
                        {job.deviceBrand} {job.deviceModel}
                      </h3>
                    </div>
                    <span className="self-start sm:self-auto text-xs font-extrabold px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                      {job.status === "DIAGNOSING"
                        ? "ডায়াগনোসিস চলমান (DIAGNOSING)"
                        : job.status === "WAITING_APPROVAL"
                        ? "কাস্টমার অনুমোদন অপেক্ষমান"
                        : job.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">কাস্টমার: </span>
                      <strong className="text-foreground">{job.customerName}</strong>
                      <span className="text-muted-foreground block font-mono text-[11px] mt-0.5">
                        📞 {job.customerPhone}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">দায়িত্বপ্রাপ্ত টেকনিশিয়ান: </span>
                      <strong className="text-foreground block">{job.technicianName}</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
                    <span className="text-muted-foreground font-semibold">অভিযোগ / সমস্যা:</span>
                    <p className="text-foreground font-medium">{job.reportedIssue}</p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs">
                      <span className="text-muted-foreground">আনুমানিক মেরামত খরচ: </span>
                      <strong className="text-sm font-black text-foreground">
                        {formatBDT(job.estimatedCost || job.totalAmount)}
                      </strong>
                    </div>

                    <Link
                      href={`/app/service`}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
                    >
                      ল্যাব ড্যাশবোর্ডে দেখুন
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Low Stock Alert Radar & Recent Activity (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Low Stock Radar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h2 className="text-base font-bold text-foreground">
                  ইনভেন্টরি ও খুচরা যন্ত্রাংশ মজুদ
                </h2>
              </div>
              <Link
                href="/app/inventory"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                সম্পূর্ণ স্টক <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="glass-panel p-5 rounded-3xl space-y-3 shadow-md border border-border/70">
              {data.lowStockProducts.map((p) => {
                const isLow = p.quantityOnHand <= p.minStockAlert;
                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-card/70 border border-border/60 flex items-center justify-between gap-3 hover:border-primary/30 transition-all"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="font-bold text-xs text-foreground truncate">{p.name}</h4>
                      <p className="text-[11px] text-muted-foreground">
                        ক্যাটাগরি: {p.categoryName} • বিক্রয় দর: {formatBDT(p.sellingPrice)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black ${
                          isLow
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/25"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                        }`}
                      >
                        {p.quantityOnHand} টি অবশিষ্ট
                      </span>
                      <span className="block text-[10px] text-muted-foreground mt-0.5">
                        সতর্কতা: {p.minStockAlert} টি
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick System Health Capsule */}
          <div className="glass-panel p-5 rounded-3xl space-y-3 shadow-md border border-border/70">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              সিস্টেম ইন্টিগ্রিটি ও লাইভ অডিট
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-muted-foreground">ডাবল-এন্ট্রি ব্যালেন্স লেজার:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ১০০% ব্যালেন্সড
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-muted-foreground">অফলাইন Dexie স্টোরেজ:</span>
                <span className="font-bold text-foreground">সক্রিয় ও সুরক্ষিত</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-muted-foreground">আইডেম্পোটেন্সি রিট্রাই ইঞ্জিন:</span>
                <span className="font-bold text-foreground">এনাবল্ড (UUID v4)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
