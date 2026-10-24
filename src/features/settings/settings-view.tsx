"use client";

import React, { useState, useEffect } from "react";
import { SerializedShopSettings, ShopSettingsConfig } from "./settings-service";
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
  WifiOff,
  Trash2,
  ShieldCheck,
  Package,
  Layers,
  Sparkles,
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

  // Check SW and Offline DB on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        if (regs.length > 0) {
          setSwStatus(`সক্রিয় (Active - ${regs.length} worker)`);
        } else {
          setSwStatus("নিবন্ধিত নয় (Not registered)");
        }
      });

      // Dexie count
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
            <Settings className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">
                দোকান ও সিস্টেম সেটিংস
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                PWA Enterprise
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              রাশেদ টেলিকম-এর প্রোফাইল, ক্যাশ মেমো, ওয়ারেন্টি পলিসি, লিমিট ও সিস্টেম ডায়াগনস্টিকস
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-border rounded-xl hover:bg-muted/60 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
            রিফ্রেশ
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
          </button>
        </div>
      </div>

      {/* Toast Notification Alert */}
      {toast && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-200 ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
              : "bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-3">
            {toast.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs font-semibold px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10"
          >
            বন্ধ করুন
          </button>
        </div>
      )}

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">ক্যাটালগ পণ্য</p>
            <p className="text-xl font-bold text-foreground">{initialSettings.stats.totalProducts}</p>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">নিবন্ধিত কাস্টমার</p>
            <p className="text-xl font-bold text-foreground">{initialSettings.stats.totalCustomers}</p>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">স্টাফ সদস্য</p>
            <p className="text-xl font-bold text-foreground">{initialSettings.stats.totalStaff}</p>
          </div>
        </div>
        <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">মোট সেলস ইনভয়েস</p>
            <p className="text-xl font-bold text-foreground">{initialSettings.stats.totalSales}</p>
          </div>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab("PROFILE")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "PROFILE"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <Store className="w-4 h-4" />
          দোকান প্রোফাইল
        </button>
        <button
          onClick={() => setActiveTab("RECEIPT")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "RECEIPT"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <Printer className="w-4 h-4" />
          ক্যাশ মেমো ও প্রিন্টার
        </button>
        <button
          onClick={() => setActiveTab("SERVICE")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "SERVICE"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <Wrench className="w-4 h-4" />
          সার্ভিসিং ও ওয়ারেন্টি
        </button>
        <button
          onClick={() => setActiveTab("SECURITY")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "SECURITY"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          সিকিউরিটি ও অনুমোদন সীমা
        </button>
        <button
          onClick={() => setActiveTab("MEMBERS")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "MEMBERS"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <Users className="w-4 h-4" />
          অ্যাক্সেস ও মেম্বার তালিকা
        </button>
        <button
          onClick={() => setActiveTab("PWA_SYSTEM")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "PWA_SYSTEM"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          <Smartphone className="w-4 h-4" />
          PWA ও ডায়াগনস্টিকস
        </button>
      </div>

      {/* TAB 1: SHOP PROFILE */}
      {activeTab === "PROFILE" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="space-y-4 md:col-span-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Store className="w-5 h-5 text-primary" />
              প্রতিষ্ঠানের মৌলিক পরিচিতি
            </h2>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
              দোকানের নাম (Shop Name) *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="রাশেদ টেলিকম"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
              যোগাযোগের ফোন নম্বর (Phone)
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="01700000000"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
              দোকানের ঠিকানা (Address)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="সেন্ট্রাল বাসস্ট্যান্ড রোড, কালীগঞ্জ, ঝিনাইদহ"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
              অফিসিয়াল ইমেইল (Email)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="rashed@telecom.bd"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
              ট্যাক্স / ভ্যাট রেজিস্ট্রেশন নং (BIN / Tax ID)
            </label>
            <input
              type="text"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="BIN-9812456712"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                মুদ্রা (Currency)
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                disabled
              />
              <span className="text-[11px] text-muted-foreground mt-1 block">বাংলাদেশ টাকা (BDT ৳)</span>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                সময় অঞ্চল (Timezone)
              </label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                disabled
              />
              <span className="text-[11px] text-muted-foreground mt-1 block">ঢাকা সময় (GMT+6)</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECEIPT & THERMAL PRINTER */}
      {activeTab === "RECEIPT" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Settings Form (7 cols) */}
          <div className="lg:col-span-7 space-y-5 bg-card border border-border p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Printer className="w-5 h-5 text-primary" />
              ক্যাশ মেমো ও প্রিন্টার ফরম্যাট
            </h2>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                কাগজের মাপ (Thermal Paper Size)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setReceiptPaperSize("80mm")}
                  className={`p-3.5 border rounded-xl flex items-center justify-between text-left transition-all ${
                    receiptPaperSize === "80mm"
                      ? "border-primary bg-primary/5 text-primary font-semibold ring-2 ring-primary/20"
                      : "border-border text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold">৮০ মিমি (80mm POS)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">স্ট্যান্ডার্ড থার্মাল ডেস্কটপ প্রিন্টার</p>
                  </div>
                  {receiptPaperSize === "80mm" && <CheckCircle2 className="w-5 h-5 text-primary" />}
                </button>

                <button
                  type="button"
                  onClick={() => setReceiptPaperSize("58mm")}
                  className={`p-3.5 border rounded-xl flex items-center justify-between text-left transition-all ${
                    receiptPaperSize === "58mm"
                      ? "border-primary bg-primary/5 text-primary font-semibold ring-2 ring-primary/20"
                      : "border-border text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold">৫৮ মিমি (58mm Mini)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">হ্যান্ডহেল্ড পোর্টেবল ব্লুটুথ প্রিন্টার</p>
                  </div>
                  {receiptPaperSize === "58mm" && <CheckCircle2 className="w-5 h-5 text-primary" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                রসিদের হেডার টেক্সট (Receipt Header)
              </label>
              <textarea
                rows={3}
                value={receiptHeader}
                onChange={(e) => setReceiptHeader(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="দোকানের নাম, ঠিকানা এবং যোগাযোগের নম্বর"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                রসিদের ফুটার ও ওয়ারেন্টি বার্তা (Receipt Footer)
              </label>
              <textarea
                rows={3}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="রিটার্ন পলিসি, ওয়ারেন্টির নিয়মাবলী এবং শুভেচ্ছা বার্তা"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-xl">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-primary" />
                  রসিদে QR কোড / বারকোড মুদ্রণ
                </span>
                <p className="text-xs text-muted-foreground">
                  গ্রাহক ইনভয়েস সহজে স্ক্যান ও ভেরিফাই করার জন্য রসিদের নিচে QR কোড যুক্ত করুন।
                </p>
              </div>
              <input
                type="checkbox"
                checked={showReceiptQr}
                onChange={(e) => setShowReceiptQr(e.target.checked)}
                className="w-5 h-5 accent-primary rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Real-time Thermal Receipt Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                লাইভ প্রিন্ট প্রিভিউ ({receiptPaperSize})
              </span>
              <span className="text-[11px] font-mono text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                অটো রিফ্রেশ
              </span>
            </div>

            <div
              className={`mx-auto bg-white text-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 p-5 rounded-lg shadow-md border-t-8 border-primary font-mono text-xs select-none transition-all duration-300 ${
                receiptPaperSize === "58mm" ? "max-w-[280px]" : "max-w-[340px]"
              }`}
            >
              {/* Header */}
              <div className="text-center pb-2 border-b border-dashed border-zinc-400 whitespace-pre-line leading-relaxed">
                <p className="font-bold text-sm tracking-wide">{name || "রাশেদ টেলিকম"}</p>
                <p className="text-[11px] text-zinc-700">{receiptHeader}</p>
                <p className="text-[10px] text-zinc-500 mt-1">ক্যাশ মেমো / ইনভয়েস</p>
              </div>

              {/* Invoice Meta */}
              <div className="py-2 border-b border-dashed border-zinc-400 text-[10px] space-y-0.5 text-zinc-600">
                <div className="flex justify-between">
                  <span>মেমো নং:</span>
                  <span className="font-bold text-zinc-900">INV-20261024-001</span>
                </div>
                <div className="flex justify-between">
                  <span>তারিখ ও সময়:</span>
                  <span>২৪ অক্টো ২০২৬, ৫:৩০ PM</span>
                </div>
                <div className="flex justify-between">
                  <span>কাস্টমার:</span>
                  <span>মোঃ আল-আমিন (নগদ)</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-2 border-b border-dashed border-zinc-400 space-y-1">
                <div className="flex justify-between font-bold text-[11px] pb-1 border-b border-zinc-300">
                  <span>বিবরণ</span>
                  <span>পরিমাণ x দর = টাকা</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>1. Samsung A15</span>
                  <span>১ x ২১,৫০০</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>2. Anker Fast Charger</span>
                  <span>১ x ১,৩৫০</span>
                </div>
              </div>

              {/* Totals */}
              <div className="py-2 border-b border-dashed border-zinc-400 space-y-1">
                <div className="flex justify-between">
                  <span>মোট সাবটোটাল:</span>
                  <span>৳২২,৮৫০</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>ডিসকাউন্ট:</span>
                  <span>-৳৩৫০</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-zinc-950 pt-1 border-t border-zinc-300">
                  <span>সর্বমোট প্রদেয়:</span>
                  <span>৳২২,৫০০</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold text-[11px]">
                  <span>পরিশোধ (নগদ):</span>
                  <span>৳২২,৫০০</span>
                </div>
              </div>

              {/* QR Code and Footer */}
              <div className="pt-3 text-center space-y-2">
                {showReceiptQr && (
                  <div className="flex flex-col items-center justify-center py-1">
                    <div className="w-16 h-16 bg-zinc-200 border border-zinc-400 rounded flex items-center justify-center text-zinc-600">
                      <QrCode className="w-10 h-10" />
                    </div>
                    <span className="text-[9px] text-zinc-500 mt-0.5">ইনভয়েস ভেরিফিকেশন QR</span>
                  </div>
                )}
                <p className="text-[10px] text-zinc-600 whitespace-pre-line leading-normal">
                  {receiptFooter}
                </p>
                <p className="text-[9px] text-zinc-400 pt-1 border-t border-dotted border-zinc-300">
                  সফটওয়্যার প্রস্তুতকারক: Rashed Telecom PWA v1.0
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SERVICING & WARRANTY */}
      {activeTab === "SERVICE" && (
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <Wrench className="w-5 h-5 text-primary" />
            মোবাইল সার্ভিসিং ল্যাব ও ওয়ারেন্টি পলিসি
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                ডিফল্ট সার্ভিস ওয়ারেন্টি মেয়াদ (দিন হিসেবে)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={serviceWarrantyDays}
                  onChange={(e) => setServiceWarrantyDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-muted-foreground">দিন</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                যেমন: ডিসপ্লে বা ব্যাটারি রিপ্লেসমেন্টের ক্ষেত্রে স্বয়ংক্রিয়ভাবে ইনভয়েসে প্রযোজ্য হবে।
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                ন্যূনতম টেকনিশিয়ান ডায়াগনস্টিক ফি (Diagnostic Fee)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={minDiagnosticFee}
                  onChange={(e) => setMinDiagnosticFee(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-muted-foreground">৳ BDT</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                কাস্টমার মেরামত বাতিল করলেও প্রাথমিক পরীক্ষণ বাবদ যে ন্যূনতম ফি ধার্য হবে।
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
                ডিভাইস রিসিভিং শর্তাবলী (Terms & Conditions Disclaimer)
              </label>
              <textarea
                rows={3}
                value={serviceTermsNote}
                onChange={(e) => setServiceTermsNote(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="সার্ভিসিং মেমোতে উল্লেখিত কাস্টমার ডিসক্লেইমার নোট"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY & LIMITS */}
      {activeTab === "SECURITY" && (
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <ShieldAlert className="w-5 h-5 text-primary" />
            দ্বৈত নিয়ন্ত্রণ (Maker-Checker) ও অনুমোদন সীমা
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 border border-border rounded-xl bg-muted/20 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                ডিসকাউন্ট অনুমোদন সীমা (Discount Dual-Control)
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ক্যাশিয়ার বিক্রয়ের সময় এই পরিমাণের বেশি ছাড় দিলে ইনভয়েসটি পেন্ডিং হিসেবে ওনারের অনুমোদনের জন্য জমা হবে।
              </p>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={discountApprovalThreshold}
                  onChange={(e) => setDiscountApprovalThreshold(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-muted-foreground">৳ BDT</span>
              </div>
            </div>

            <div className="p-4 border border-border rounded-xl bg-muted/20 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                <Package className="w-5 h-5 text-amber-600" />
                ডিফল্ট লো-স্টক সতর্কবার্তা সীমা (Low Stock Alert)
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                পণ্য স্টক ব্যালেন্স এই সীমার নিচে নামলে ইনভেন্টরি ড্যাশবোর্ড ও নোটিফিকেশনে লাল সতর্কবার্তা প্রদর্শিত হবে।
              </p>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={lowStockThresholdDefault}
                  onChange={(e) => setLowStockThresholdDefault(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-muted-foreground">টি পণ্য</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MEMBERS & ROLES */}
      {activeTab === "MEMBERS" && (
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              দোকানের অনুমোদিত মেম্বার ও ভূমিকা
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground font-semibold">
              মোট: {initialSettings.members.length} জন মেম্বার
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold border-y border-border">
                <tr>
                  <th className="py-3 px-4">মেম্বারের নাম</th>
                  <th className="py-3 px-4">ফোন / ইমেইল</th>
                  <th className="py-3 px-4">নির্ধারিত ভূমিকা (Role)</th>
                  <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {initialSettings.members.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-semibold text-foreground">{m.fullName}</td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      {m.phone || m.email || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                        {m.roleName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          m.isActive
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-600 border border-red-500/20"
                        }`}
                      >
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

      {/* TAB 6: PWA, OFFLINE & SYSTEM DIAGNOSTICS */}
      {activeTab === "PWA_SYSTEM" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PWA & Service Worker */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
                <Smartphone className="w-5 h-5 text-primary" />
                PWA ও সার্ভিস ওয়ার্কার স্ট্যাটাস
              </h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-xl">
                  <span className="text-xs font-medium text-muted-foreground">সার্ভিস ওয়ার্কার:</span>
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    {swStatus}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-xl">
                  <span className="text-xs font-medium text-muted-foreground">লোকাল Dexie আউটবক্স:</span>
                  <span className="text-xs font-bold font-mono text-foreground">
                    {dexieOutboxCount} টি অনিষ্পন্ন ড্রাফট
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-xl">
                  <span className="text-xs font-medium text-muted-foreground">স্বয়ংক্রিয় অফলাইন সিঙ্ক:</span>
                  <input
                    type="checkbox"
                    checked={offlineSyncEnabled}
                    onChange={(e) => setOfflineSyncEnabled(e.target.checked)}
                    className="w-5 h-5 accent-primary rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncingOffline}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Wifi className="w-4 h-4" />
                  {isSyncingOffline ? "সিঙ্ক হচ্ছে..." : "এখনই সিঙ্ক করুন (Sync Now)"}
                </button>
                <button
                  type="button"
                  onClick={handleClearCache}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border border-red-300 text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  ক্যাশ মুছুন
                </button>
              </div>
            </div>

            {/* System & Architecture Info */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
                <Database className="w-5 h-5 text-primary" />
                সিস্টেম ও ডাটাবেজ তথ্য
              </h2>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-xl">
                  <span className="text-muted-foreground">ডাটাবেজ ইঞ্জিন:</span>
                  <span className="font-mono font-bold text-foreground">PostgreSQL 18 Local (localhost:5432)</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-xl">
                  <span className="text-muted-foreground">ডাটাবেজ নাম:</span>
                  <span className="font-mono font-bold text-foreground">rashed_telecom</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-xl">
                  <span className="text-muted-foreground">অ্যাপ্লিকেশন ফ্রেমওয়ার্ক:</span>
                  <span className="font-mono font-bold text-foreground">Next.js 15.5 (App Router + Turbopack)</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-xl">
                  <span className="text-muted-foreground">প্রিজমা ওআরএম (Prisma):</span>
                  <span className="font-mono font-bold text-foreground">v5.22.0 (Double-entry Invariant)</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-xl">
                  <span className="text-muted-foreground">সময় অঞ্চল ও মুদ্রা:</span>
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
