"use client";

import React, { useState, useEffect } from "react";
import { SerializedShopSettings } from "./settings-service";
import { getOfflineDatabase } from "@/lib/offline/db";
import {
  Settings,
  Store,
  Printer,
  Wrench,
  ShieldAlert,
  Users,
  Smartphone,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  QrCode,
  FileText,
  Database,
  Wifi,
  Trash2,
  ShieldCheck,
  Package,
  Sparkles,
  Phone,
  MapPin,
  Mail,
  Receipt,
  Check,
  Clock,
  Zap,
  Activity,
  Layers,
  Fingerprint,
  ChevronRight,
  PrinterIcon,
} from "lucide-react";

interface SettingsViewProps {
  shopId: string;
  initialSettings: SerializedShopSettings;
}

type TabType = "PROFILE" | "RECEIPT" | "SERVICE" | "SECURITY" | "MEMBERS" | "PWA_SYSTEM";

export function SettingsView({ shopId, initialSettings }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("PROFILE");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form State
  const [name, setName] = useState(initialSettings.name);
  const [currency, setCurrency] = useState(initialSettings.currency);
  const [timezone, setTimezone] = useState(initialSettings.timezone);

  // Settings JSON State
  const [phone, setPhone] = useState(initialSettings.settings.phone || "01700000000");
  const [address, setAddress] = useState(initialSettings.settings.address || "সেন্ট্রাল বাসস্ট্যান্ড রোড, কালীগঞ্জ, ঝিনাইদহ");
  const [email, setEmail] = useState(initialSettings.settings.email || "rashed@telecom.bd");
  const [taxNumber, setTaxNumber] = useState(initialSettings.settings.taxNumber || "BIN-9812456712");

  // Receipt Settings
  const [receiptHeader, setReceiptHeader] = useState(
    initialSettings.settings.receiptHeader || "রাশেদ টেলিকম\nমোবাইল সেলস ও অত্যাধুনিক সার্ভিসিং সেন্টার\nফোন: 01700000000"
  );
  const [receiptFooter, setReceiptFooter] = useState(
    initialSettings.settings.receiptFooter || "বিক্রিত পণ্য ৭ দিনের মধ্যে মেমোসহ ফেরতযোগ্য।\nডিসপ্লে ও ব্যাটারিতে ৩০ দিনের সার্ভিস ওয়ারেন্টি।"
  );
  const [receiptPaperSize, setReceiptPaperSize] = useState<"80mm" | "58mm">(
    initialSettings.settings.receiptPaperSize || "80mm"
  );
  const [showReceiptQr, setShowReceiptQr] = useState<boolean>(
    initialSettings.settings.showReceiptQr ?? true
  );

  // Servicing Policy
  const [serviceWarrantyDays, setServiceWarrantyDays] = useState<number>(
    initialSettings.settings.serviceWarrantyDays || 30
  );
  const [minDiagnosticFee, setMinDiagnosticFee] = useState<number>(
    initialSettings.settings.minDiagnosticFee || 100
  );
  const [serviceTermsNote, setServiceTermsNote] = useState<string>(
    initialSettings.settings.serviceTermsNote ||
      "কাস্টমার কর্তৃক প্রদত্ত পাসওয়ার্ড/প্যাটার্ন লক সংরক্ষণ করা হবে না। সার্ভিসিং মেমো প্রদর্শন আবশ্যক।"
  );

  // Security & Limits
  const [discountApprovalThreshold, setDiscountApprovalThreshold] = useState<number>(
    initialSettings.settings.discountApprovalThreshold || 500
  );
  const [lowStockThresholdDefault, setLowStockThresholdDefault] = useState<number>(
    initialSettings.settings.lowStockThresholdDefault || 5
  );
  const [offlineSyncEnabled, setOfflineSyncEnabled] = useState<boolean>(
    initialSettings.settings.offlineSyncEnabled ?? true
  );

  // Offline Diagnostics State
  const [swStatus, setSwStatus] = useState<string>("যাচাই করা হচ্ছে...");
  const [dexieOutboxCount, setDexieOutboxCount] = useState<number>(0);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [simulatedPrintSuccess, setSimulatedPrintSuccess] = useState(false);

  // Check SW and Offline DB on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        if (regs.length > 0) {
          setSwStatus(`সক্রিয় (Active - ${regs.length} worker)`);
        } else {
          setSwStatus("নিবন্ধিত নয় (Standby)");
        }
      });

      try {
        const db = getOfflineDatabase();
        db.syncOutbox.count().then((c) => setDexieOutboxCount(c));
      } catch {
        setDexieOutboxCount(0);
      }
    }
  }, []);

  // Save changes
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setToast(null);

    try {
      const payload = {
        shopId,
        name,
        currency,
        timezone,
        settings: {
          phone,
          address,
          email,
          taxNumber,
          receiptHeader,
          receiptFooter,
          receiptPaperSize,
          showReceiptQr,
          serviceWarrantyDays: Number(serviceWarrantyDays),
          minDiagnosticFee: Number(minDiagnosticFee),
          serviceTermsNote,
          discountApprovalThreshold: Number(discountApprovalThreshold),
          lowStockThresholdDefault: Number(lowStockThresholdDefault),
          offlineSyncEnabled,
        },
      };

      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "সেটিংস সংরক্ষণ করতে ব্যর্থ হয়েছে।");
      }

      setToast({
        type: "success",
        message: "দোকান ও সিস্টেম সেটিংস সফলভাবে আপডেট ও সংরক্ষিত হয়েছে!",
      });

      setTimeout(() => setToast(null), 5000);
    } catch (err: any) {
      setToast({
        type: "error",
        message: err.message || "একটি ত্রুটি ঘটেছে। দয়া করে পুনরায় চেষ্টা করুন।",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger Offline Manual Sync
  const handleManualSync = async () => {
    setIsSyncingOffline(true);
    try {
      const db = getOfflineDatabase();
      const pendingItems = await db.syncOutbox.where("status").equals("PENDING").toArray();

      if (pendingItems.length === 0) {
        setToast({
          type: "success",
          message: "লোকাল আউটবক্সে কোনো অনিষ্পন্ন ড্রাফট নেই। সিস্টেম সম্পূর্ণ আপ-টু-ডেট!",
        });
      } else {
        const res = await fetch("/api/v1/sync/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shopId,
            items: pendingItems.map((item) => ({
              outboxId: item.id,
              operationId: item.operationId,
              entityType: item.entityType,
              schemaVersion: item.schemaVersion,
              payload: item.payload,
            })),
          }),
        });
        if (res.ok) {
          await db.syncOutbox.where("status").equals("PENDING").delete();
          setDexieOutboxCount(0);
          setToast({
            type: "success",
            message: `${pendingItems.length} টি অনিষ্পন্ন অফলাইন ট্রানজ্যাকশন সার্ভারের সাথে সিঙ্ক হয়েছে!`,
          });
        }
      }
    } catch {
      setToast({
        type: "error",
        message: "ম্যানুয়াল সিঙ্ক সম্পন্ন করতে সমস্যা হয়েছে।",
      });
    } finally {
      setIsSyncingOffline(false);
    }
  };

  // Clear Local Cache
  const handleClearCache = async () => {
    if (confirm("আপনি কি নিশ্চিত যে স্থানীয় ক্যাশ এবং ড্রাফট মুছে ফেলতে চান?")) {
      try {
        const db = getOfflineDatabase();
        await db.syncOutbox.clear();
        await db.draftSales.clear();
        await db.draftRepairs.clear();
        setDexieOutboxCount(0);
        setToast({
          type: "success",
          message: "স্থানীয় অফলাইন ক্যাশ সফলভাবে খালি করা হয়েছে।",
        });
      } catch {
        setToast({ type: "error", message: "ক্যাশ সাফ করতে সমস্যা হয়েছে।" });
      }
    }
  };

  // Print test receipt simulation
  const handlePrintTest = () => {
    setSimulatedPrintSuccess(true);
    setTimeout(() => setSimulatedPrintSuccess(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-32 lg:pb-12">
      {/* 1. HERO HEADER WITH AMBIENT GRADIENTS & MICRO-GLOW */}
      <div className="relative overflow-hidden rounded-3xl border border-white/60 dark:border-white/10 glass-panel p-6 sm:p-8 shadow-xl">
        {/* Ambient Gradient Glow Orbs */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-primary/20 via-indigo-500/15 to-transparent blur-3xl pointer-events-none animate-pulse-subtle" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-gradient-to-tr from-cyan-400/15 via-emerald-400/10 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 opacity-60 blur-sm group-hover:opacity-90 transition duration-300" />
              <div className="relative w-16 h-16 rounded-2xl bg-card border border-white/40 dark:border-white/10 flex items-center justify-center text-primary shadow-lg shadow-primary/20">
                <Settings className="w-8 h-8 transition-transform duration-500 group-hover:rotate-45" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text">
                  দোকান ও সিস্টেম সেটিংস
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  PWA Enterprise • Active
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
                রাশেদ টেলিকম-এর প্রোফাইল, ক্যাশ মেমো ফরম্যাট, প্রিন্টার সেটিংস, ওয়ারেন্টি পলিসি ও আধুনিক অফলাইন সিঙ্ক ইঞ্জিন
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border border-border/80 bg-background/80 hover:bg-muted/70 rounded-xl transition-all shadow-xs hover:shadow-sm active:scale-95"
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
              রিফ্রেশ
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="relative group overflow-hidden flex items-center gap-2.5 px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-95 transition-all shimmer-button disabled:opacity-50"
            >
              <Save className="w-4 h-4 transition-transform group-hover:scale-110" />
              <span>{isSaving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. TOAST NOTIFICATION BANNER */}
      {toast && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300 ${
            toast.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
              : "bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shadow-xs ${
                toast.type === "success"
                  ? "bg-emerald-500 text-white"
                  : "bg-red-500 text-white"
              }`}
            >
              {toast.type === "success" ? (
                <Check className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            বন্ধ করুন
          </button>
        </div>
      )}

      {/* 3. KPI METRIC CARDS WITH GLASSMORPHISM & HOVER ELEVATION */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/15 transition-all duration-300" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ক্যাটালগ পণ্য</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground tracking-tight">
              {initialSettings.stats.totalProducts}
            </span>
            <span className="text-xs text-muted-foreground font-semibold">আইটেম সক্রিয়</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/15 transition-all duration-300" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">নিবন্ধিত কাস্টমার</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground tracking-tight">
              {initialSettings.stats.totalCustomers}
            </span>
            <span className="text-xs text-muted-foreground font-semibold">গ্রাহক তালিকা</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/15 transition-all duration-300" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">স্টাফ ও টেকনিশিয়ান</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground tracking-tight">
              {initialSettings.stats.totalStaff}
            </span>
            <span className="text-xs text-muted-foreground font-semibold">সদস্য প্রোফাইল</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/15 transition-all duration-300" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">মোট সেলস ইনভয়েস</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground tracking-tight">
              {initialSettings.stats.totalSales}
            </span>
            <span className="text-xs text-muted-foreground font-semibold">মেমো তৈরি</span>
          </div>
        </div>
      </div>

      {/* 4. MODERN FLOATING PILL TAB NAVIGATION */}
      <div className="p-1.5 bg-muted/60 dark:bg-muted/30 border border-border/80 rounded-2xl backdrop-blur-md flex items-center gap-1.5 overflow-x-auto scrollbar-none shadow-inner">
        <button
          onClick={() => setActiveTab("PROFILE")}
          className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === "PROFILE"
              ? "bg-card text-primary shadow-md border border-border/60 scale-[1.01]"
              : "text-muted-foreground hover:text-foreground hover:bg-card/40"
          }`}
        >
          <Store className="w-4 h-4" />
          দোকান প্রোফাইল
        </button>
        <button
          onClick={() => setActiveTab("RECEIPT")}
          className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === "RECEIPT"
              ? "bg-card text-primary shadow-md border border-border/60 scale-[1.01]"
              : "text-muted-foreground hover:text-foreground hover:bg-card/40"
          }`}
        >
          <Printer className="w-4 h-4" />
          ক্যাশ মেমো ও প্রিন্টার
        </button>
        <button
          onClick={() => setActiveTab("SERVICE")}
          className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === "SERVICE"
              ? "bg-card text-primary shadow-md border border-border/60 scale-[1.01]"
              : "text-muted-foreground hover:text-foreground hover:bg-card/40"
          }`}
        >
          <Wrench className="w-4 h-4" />
          সার্ভিসিং ও ওয়ারেন্টি
        </button>
        <button
          onClick={() => setActiveTab("SECURITY")}
          className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === "SECURITY"
              ? "bg-card text-primary shadow-md border border-border/60 scale-[1.01]"
              : "text-muted-foreground hover:text-foreground hover:bg-card/40"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          সিকিউরিটি ও লিমিট
        </button>
        <button
          onClick={() => setActiveTab("MEMBERS")}
          className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === "MEMBERS"
              ? "bg-card text-primary shadow-md border border-border/60 scale-[1.01]"
              : "text-muted-foreground hover:text-foreground hover:bg-card/40"
          }`}
        >
          <Users className="w-4 h-4" />
          অ্যাক্সেস ও মেম্বার
        </button>
        <button
          onClick={() => setActiveTab("PWA_SYSTEM")}
          className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === "PWA_SYSTEM"
              ? "bg-card text-primary shadow-md border border-border/60 scale-[1.01]"
              : "text-muted-foreground hover:text-foreground hover:bg-card/40"
          }`}
        >
          <Smartphone className="w-4 h-4" />
          PWA ও ডায়াগনস্টিকস
        </button>
      </div>

      {/* 5. TAB 1: SHOP PROFILE */}
      {activeTab === "PROFILE" && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl shadow-lg border border-border/70 space-y-6">
          <div className="border-b border-border/70 pb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2.5">
              <Store className="w-5 h-5 text-primary" />
              প্রতিষ্ঠানের মৌলিক তথ্য ও সাধারণ সেটিংস
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              দোকানের অফিসিয়াল নাম, ফোন, ঠিকানা এবং ট্যাক্স আইডেন্টিফায়ার ইনভয়েসে স্বয়ংক্রিয়ভাবে যুক্ত থাকবে
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Store className="w-3.5 h-3.5 text-primary" />
                দোকানের নাম (Shop Name) *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-background/80 border border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary transition-all font-semibold"
                placeholder="রাশেদ টেলিকম"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-primary" />
                যোগাযোগের ফোন নম্বর (Phone)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-background/80 border border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary transition-all font-mono"
                placeholder="01700000000"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                দোকানের ঠিকানা (Address)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-background/80 border border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary transition-all"
                placeholder="সেন্ট্রাল বাসস্ট্যান্ড রোড, কালীগঞ্জ, ঝিনাইদহ"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-primary" />
                অফিসিয়াল ইমেইল (Email)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-background/80 border border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary transition-all font-mono"
                placeholder="rashed@telecom.bd"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Receipt className="w-3.5 h-3.5 text-primary" />
                ট্যাক্স / ভ্যাট রেজিস্ট্রেশন নং (BIN / Tax ID)
              </label>
              <input
                type="text"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-background/80 border border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary transition-all font-mono"
                placeholder="BIN-9812456712"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  মুদ্রা (Currency)
                </label>
                <div className="p-3 bg-muted/40 border border-border rounded-xl flex items-center justify-between">
                  <span className="font-mono font-bold text-foreground">BDT (৳)</span>
                  <span className="text-[11px] text-muted-foreground">টাকা</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  সময় অঞ্চল (Timezone)
                </label>
                <div className="p-3 bg-muted/40 border border-border rounded-xl flex items-center justify-between">
                  <span className="font-mono font-bold text-foreground">Asia/Dhaka</span>
                  <span className="text-[11px] text-muted-foreground">GMT+6</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 2: RECEIPT & PHOTOREALISTIC THERMAL PRINTER PREVIEW */}
      {activeTab === "RECEIPT" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Settings Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6 glass-panel p-6 sm:p-8 rounded-3xl shadow-lg border border-border/70">
            <div className="border-b border-border/70 pb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-primary" />
                ক্যাশ মেমো ও প্রিন্টার ফরম্যাট কনফিগারেশন
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                থার্মাল রোল প্রিন্টারের মাপ, রসিদ হেডার, ফুটার এবং ভেরিফিকেশন QR কোড সেটআপ
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                কাগজের মাপ (Thermal Paper Size)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setReceiptPaperSize("80mm")}
                  className={`p-4 border rounded-2xl flex items-center justify-between text-left transition-all ${
                    receiptPaperSize === "80mm"
                      ? "border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary/30 shadow-md scale-[1.01]"
                      : "border-border bg-card/60 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <div>
                    <p className="text-sm font-extrabold text-foreground">৮০ মিমি (80mm POS)</p>
                    <p className="text-xs text-muted-foreground mt-1">স্ট্যান্ডার্ড থার্মাল ডেস্কটপ প্রিন্টার</p>
                  </div>
                  {receiptPaperSize === "80mm" && (
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setReceiptPaperSize("58mm")}
                  className={`p-4 border rounded-2xl flex items-center justify-between text-left transition-all ${
                    receiptPaperSize === "58mm"
                      ? "border-primary bg-primary/10 text-primary font-bold ring-2 ring-primary/30 shadow-md scale-[1.01]"
                      : "border-border bg-card/60 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <div>
                    <p className="text-sm font-extrabold text-foreground">৫৮ মিমি (58mm Mini)</p>
                    <p className="text-xs text-muted-foreground mt-1">হ্যান্ডহেল্ড ব্লুটুথ পোর্টেবল রসিদ</p>
                  </div>
                  {receiptPaperSize === "58mm" && (
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                রসিদের হেডার টেক্সট (Receipt Header)
              </label>
              <textarea
                rows={3}
                value={receiptHeader}
                onChange={(e) => setReceiptHeader(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-background/80 border border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary transition-all leading-relaxed font-mono"
                placeholder="দোকানের নাম, ঠিকানা এবং ফোন নম্বর"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                রসিদের ফুটার ও ওয়ারেন্টি বার্তা (Receipt Footer)
              </label>
              <textarea
                rows={3}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-background/80 border border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary transition-all leading-relaxed font-mono"
                placeholder="রিটার্ন পলিসি ও ওয়ারেন্টির নিয়মাবলী"
              />
            </div>

            {/* Custom Styled Interactive Switch */}
            <div className="flex items-center justify-between p-4 bg-muted/40 border border-border rounded-2xl">
              <div className="space-y-1">
                <span className="text-sm font-bold text-foreground flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-primary" />
                  রসিদে ইনভয়েস QR কোড প্রিন্ট করুন
                </span>
                <p className="text-xs text-muted-foreground">
                  গ্রাহক ইনভয়েস স্ক্যান করে ডিজিটাল স্টেটমেন্ট ও সার্ভিসের স্ট্যাটাস যাচাই করতে পারবেন
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptQr(!showReceiptQr)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showReceiptQr ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    showReceiptQr ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Photorealistic Thermal Receipt Simulator (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                থার্মাল প্রিন্ট সিমুলেটর ({receiptPaperSize})
              </span>
              <button
                type="button"
                onClick={handlePrintTest}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors border border-primary/20"
              >
                <PrinterIcon className="w-3.5 h-3.5" />
                {simulatedPrintSuccess ? "প্রিন্ট সম্পন্ন!" : "টেস্ট প্রিন্ট প্রিভিউ"}
              </button>
            </div>

            {/* Thermal Ticket Container with drop shadow & realistic paper rip */}
            <div
              className={`mx-auto bg-[#faf8f5] dark:bg-[#f5f2eb] text-zinc-900 rounded-xl shadow-2xl border border-zinc-300/80 font-mono text-xs select-none relative transition-all duration-300 ${
                receiptPaperSize === "58mm" ? "max-w-[280px]" : "max-w-[340px]"
              }`}
            >
              {/* Paper Top Jagged Serration */}
              <div className="h-3 w-full bg-[#faf8f5] dark:bg-[#f5f2eb] border-b border-dashed border-zinc-400 flex items-center justify-center">
                <div className="w-12 h-1 bg-zinc-300 rounded-full" />
              </div>

              <div className="p-5 space-y-3">
                {/* Header */}
                <div className="text-center pb-2.5 border-b border-dashed border-zinc-400 whitespace-pre-line leading-relaxed">
                  <p className="font-extrabold text-sm tracking-wide text-zinc-950 uppercase">
                    {name || "রাশেদ টেলিকম"}
                  </p>
                  <p className="text-[11px] text-zinc-700 mt-1">{receiptHeader}</p>
                  <div className="mt-2 inline-block px-2.5 py-0.5 rounded border border-zinc-400 font-bold text-[10px]">
                    ক্যাশ মেমো / ইনভয়েস
                  </div>
                </div>

                {/* Metadata */}
                <div className="py-2 border-b border-dashed border-zinc-400 text-[10px] space-y-1 text-zinc-700">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">ইনভয়েস নং:</span>
                    <span className="font-bold text-zinc-950">INV-20261024-001</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">তারিখ ও সময়:</span>
                    <span>২৪ অক্টো ২০২৬, ৫:৩০ PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">কাস্টমার:</span>
                    <span className="font-bold">মোঃ আল-আমিন (নগদ)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">বিক্রেতা:</span>
                    <span>রাশেদ (এডমিন)</span>
                  </div>
                </div>

                {/* Items */}
                <div className="py-2 border-b border-dashed border-zinc-400 space-y-1.5">
                  <div className="flex justify-between font-bold text-[11px] pb-1 border-b border-zinc-300">
                    <span>আইটেম বিবরণ</span>
                    <span>পরিমাণ x দর = টাকা</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="font-medium">1. Samsung A15 (6/128)</span>
                    <span className="font-semibold">১ x ২১,৫০০</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="font-medium">2. Anker Fast Charger 20W</span>
                    <span className="font-semibold">১ x ১,৩৫০</span>
                  </div>
                </div>

                {/* Totals */}
                <div className="py-2 border-b border-dashed border-zinc-400 space-y-1">
                  <div className="flex justify-between text-zinc-600">
                    <span>সাবটোটাল:</span>
                    <span>৳২২,৮৫০</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>বিশেষ ডিসকাউন্ট:</span>
                    <span>-৳৩৫০</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-zinc-950 pt-1.5 border-t border-zinc-300">
                    <span>সর্বমোট প্রদেয়:</span>
                    <span>৳২২,৫০০</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-bold text-[11px] pt-0.5">
                    <span>পরিশোধ (নগদ ক্যাশ):</span>
                    <span>৳২২,৫০০</span>
                  </div>
                  <div className="flex justify-between text-zinc-500 text-[10px]">
                    <span>বকেয়া পরিমাণ:</span>
                    <span>৳০</span>
                  </div>
                </div>

                {/* QR Code with scanning laser simulation */}
                {showReceiptQr && (
                  <div className="pt-2 text-center flex flex-col items-center justify-center">
                    <div className="relative w-20 h-20 bg-white border border-zinc-400 rounded-lg p-1.5 shadow-xs overflow-hidden">
                      <QrCode className="w-full h-full text-zinc-800" />
                      {/* Animated Laser Bar */}
                      <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-sm shadow-red-500 animate-laser" />
                    </div>
                    <span className="text-[9px] text-zinc-500 mt-1 font-semibold">
                      অনলাইন মেমো ও ওয়ারেন্টি ভেরিফিকেশন QR
                    </span>
                  </div>
                )}

                {/* Footer Notes */}
                <div className="pt-2 text-center space-y-1">
                  <p className="text-[10px] text-zinc-700 whitespace-pre-line leading-relaxed">
                    {receiptFooter}
                  </p>
                  <p className="text-[9px] text-zinc-400 pt-2 border-t border-dotted border-zinc-300">
                    পাওয়ার্ড বাই: Rashed Telecom PWA v1.0 • Enterprise
                  </p>
                </div>
              </div>

              {/* Paper Bottom Perforated Cut Effect */}
              <div className="h-3 w-full bg-[#faf8f5] dark:bg-[#f5f2eb] border-t border-dashed border-zinc-400 flex items-center justify-around px-2">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 3: SERVICING & WARRANTY POLICY */}
      {activeTab === "SERVICE" && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl shadow-lg border border-border/70 space-y-6">
          <div className="border-b border-border/70 pb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2.5">
              <Wrench className="w-5 h-5 text-primary" />
              মোবাইল সার্ভিসিং ল্যাব ও ওয়ারেন্টি পলিসি কনফিগারেশন
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              কাস্টমার ডিভাইস ইনটেক ও ডেলিভারির সময় ডিফল্ট ওয়ারেন্টির মেয়াদ এবং ডায়াগনস্টিক ফি নির্ধারণ করুন
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                ডিফল্ট সার্ভিস ওয়ারেন্টির মেয়াদ (দিন)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={serviceWarrantyDays}
                  onChange={(e) => setServiceWarrantyDays(Number(e.target.value))}
                  className="w-full px-4 py-3 text-sm bg-background/80 border border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary transition-all font-bold text-foreground"
                />
                <span className="absolute right-4 top-3 text-xs font-semibold text-muted-foreground">দিন</span>
              </div>
              <p className="text-xs text-muted-foreground">
                যেমন: নতুন ডিসপ্লে অথবা ব্যাটারি রিপ্লেসমেন্টের ক্ষেত্রে ইনভয়েসে স্বয়ংক্রিয়ভাবে এই মেয়াদ যুক্ত হবে।
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                প্রাথমিক টেকনিশিয়ান ডায়াগনস্টিক ফি (Diagnostic Fee)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={minDiagnosticFee}
                  onChange={(e) => setMinDiagnosticFee(Number(e.target.value))}
                  className="w-full px-4 py-3 text-sm bg-background/80 border border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary transition-all font-bold text-foreground"
                />
                <span className="absolute right-4 top-3 text-xs font-semibold text-muted-foreground">৳ BDT</span>
              </div>
              <p className="text-xs text-muted-foreground">
                কাস্টমার মেরামত বাতিল করলেও ডিভাইস প্রাথমিক পরীক্ষণ বাবদ এই ন্যূনতম চার্জ প্রযোজ্য হবে।
              </p>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                ডিভাইস রিসিভিং শর্তাবলী (Terms & Conditions Disclaimer)
              </label>
              <textarea
                rows={3}
                value={serviceTermsNote}
                onChange={(e) => setServiceTermsNote(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-background/80 border border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary transition-all leading-relaxed"
                placeholder="সার্ভিসিং মেমোতে উল্লেখিত কাস্টমার ডিসক্লেইমার নোট"
              />
            </div>
          </div>
        </div>
      )}

      {/* 8. TAB 4: SECURITY & MAKER-CHECKER LIMITS */}
      {activeTab === "SECURITY" && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl shadow-lg border border-border/70 space-y-6">
          <div className="border-b border-border/70 pb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-primary" />
              দ্বৈত নিয়ন্ত্রণ (Maker-Checker) ও অনুমোদন সীমা
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              দোকানের আর্থিক নিরাপত্তা নিশ্চিত করতে ক্যাশিয়ার বা স্টাফদের সর্বোচ্চ ক্ষমতা ও দ্বৈত অনুমোদন থ্রেশহোল্ড
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6 rounded-2xl space-y-4 border border-border/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">ডিসকাউন্ট অনুমোদন সীমা</h3>
                  <p className="text-xs text-muted-foreground">ক্যাশিয়ার সর্বোচ্চ যে পরিমাণ সরাসরি ছাড় দিতে পারবেন</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={discountApprovalThreshold}
                  onChange={(e) => setDiscountApprovalThreshold(Number(e.target.value))}
                  className="w-full px-4 py-3 text-sm bg-background/80 border border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary transition-all font-bold text-foreground"
                />
                <span className="absolute right-4 top-3 text-xs font-semibold text-muted-foreground">৳ BDT</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                এই সীমার অতিরিক্ত ছাড় দিলে ইনভয়েসটি অটোমেটিক ওনারের &apos;অনুমোদন কেন্দ্র&apos; (Approvals)-এ জমা হবে।
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl space-y-4 border border-border/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">লো-স্টক অ্যালার্ট সীমা</h3>
                  <p className="text-xs text-muted-foreground">ইনভেন্টরি রিস্টক সতর্কতা সক্রিয় করার মাপকাঠি</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={lowStockThresholdDefault}
                  onChange={(e) => setLowStockThresholdDefault(Number(e.target.value))}
                  className="w-full px-4 py-3 text-sm bg-background/80 border border-border rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary transition-all font-bold text-foreground"
                />
                <span className="absolute right-4 top-3 text-xs font-semibold text-muted-foreground">টি পণ্য</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                কোনো পণ্যের মজুদ এই সংখ্যার নিচে নামলে ড্যাশবোর্ডে লাল রি-অর্ডার নোটিফিকেশন প্রদর্শন করবে।
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 9. TAB 5: MEMBERS & ACCESS ROLES */}
      {activeTab === "MEMBERS" && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl shadow-lg border border-border/70 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2.5">
                <Users className="w-5 h-5 text-primary" />
                অনুমোদিত শপ সদস্য ও নিরাপত্তা ভূমিকা
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                দোকানের সিস্টেমে কর্মরত কর্মচারীদের পদবী ও ভূমিকা
              </p>
            </div>
            <span className="self-start sm:self-auto text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
              মোট: {initialSettings.members.length} জন সক্রিয় মেম্বার
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/70">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[11px] font-bold border-b border-border">
                <tr>
                  <th className="py-3.5 px-5">মেম্বারের নাম</th>
                  <th className="py-3.5 px-5">যোগাযোগ</th>
                  <th className="py-3.5 px-5">নির্ধারিত ভূমিকা (Role)</th>
                  <th className="py-3.5 px-5 text-center">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-card/60">
                {initialSettings.members.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-foreground flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
                        {m.fullName.charAt(0)}
                      </div>
                      {m.fullName}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-xs text-muted-foreground">
                      {m.phone || m.email || "-"}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                        {m.roleName}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          m.isActive
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/25"
                            : "bg-red-500/10 text-red-600 border border-red-500/25"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${m.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                        {m.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 10. TAB 6: PWA, OFFLINE & SYSTEM DIAGNOSTICS */}
      {activeTab === "PWA_SYSTEM" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PWA & Service Worker */}
            <div className="glass-panel p-6 sm:p-8 rounded-3xl shadow-lg border border-border/70 space-y-5">
              <div className="border-b border-border/70 pb-4">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2.5">
                  <Smartphone className="w-5 h-5 text-primary" />
                  PWA সার্ভিস ওয়ার্কার ও লোকাল Dexie ইঞ্জিন
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  ইন্টারনেট সংযোগ বিচ্ছিন্ন থাকলেও অফলাইনে ক্যাশ মেমো ও ড্রাফট তৈরি করা সম্ভব
                </p>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-2xl">
                  <span className="text-xs font-bold text-muted-foreground">সার্ভিস ওয়ার্কার স্ট্যাটাস:</span>
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                    {swStatus}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-2xl">
                  <span className="text-xs font-bold text-muted-foreground">অনিষ্পন্ন অফলাইন আউটবক্স:</span>
                  <span className="text-xs font-extrabold font-mono text-foreground px-2.5 py-1 rounded-md bg-card border border-border">
                    {dexieOutboxCount} টি ড্রাফট
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-2xl">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground">স্বয়ংক্রিয় অফলাইন সিঙ্ক সক্রিয়</span>
                    <p className="text-[11px] text-muted-foreground">অনলাইন হওয়ামাত্র সার্ভারের সাথে ডেটা সমন্বয়</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOfflineSyncEnabled(!offlineSyncEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      offlineSyncEnabled ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        offlineSyncEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncingOffline}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold bg-primary text-white rounded-xl hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-95 disabled:opacity-50"
                >
                  <Wifi className="w-4 h-4" />
                  {isSyncingOffline ? "সিঙ্ক হচ্ছে..." : "এখনই সিঙ্ক করুন (Force Sync Now)"}
                </button>
                <button
                  type="button"
                  onClick={handleClearCache}
                  className="flex items-center gap-2 px-4 py-3 text-xs font-bold border border-red-300 text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-all active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  ক্যাশ মুছুন
                </button>
              </div>
            </div>

            {/* System Engine Specifications */}
            <div className="glass-panel p-6 sm:p-8 rounded-3xl shadow-lg border border-border/70 space-y-5">
              <div className="border-b border-border/70 pb-4">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-primary" />
                  ডাটাবেজ ও ক্লাউড ইঞ্জিন স্পেসিফিকেশন
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  লোকাল সার্ভার ও ব্যাকএন্ড আর্কিটেকচার তথ্য
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-xl">
                  <span className="text-muted-foreground font-medium">ডাটাবেজ ইঞ্জিন:</span>
                  <span className="font-mono font-bold text-foreground">PostgreSQL 18 Local (localhost:5432)</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-xl">
                  <span className="text-muted-foreground font-medium">ডাটাবেজ নাম:</span>
                  <span className="font-mono font-bold text-foreground">rashed_telecom</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-xl">
                  <span className="text-muted-foreground font-medium">অ্যাপ্লিকেশন ফ্রেমওয়ার্ক:</span>
                  <span className="font-mono font-bold text-foreground">Next.js 15.5.28 (App Router + Turbopack)</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-xl">
                  <span className="text-muted-foreground font-medium">প্রিজমা ওআরএম (Prisma):</span>
                  <span className="font-mono font-bold text-foreground">v5.22.0 (Double-entry Invariant)</span>
                </div>
                <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-xl">
                  <span className="text-muted-foreground font-medium">সময় অঞ্চল ও মুদ্রা:</span>
                  <span className="font-mono font-bold text-foreground">Asia/Dhaka (GMT+6) / BDT (৳)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
