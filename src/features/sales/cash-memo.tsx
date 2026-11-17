"use client";

import React, { useState, useEffect } from "react";
import { formatBDT, formatDateTimeDhaka, toBengaliNumerals } from "@/lib/i18n";
import {
  Printer,
  Receipt,
  CheckCircle2,
  Phone,
  MapPin,
  Clock,
  User,
  ShieldCheck,
  Smartphone,
  X,
  FileText,
  RotateCcw,
  Share2,
  MessageCircle,
  Copy,
  Check,
  Send,
  ExternalLink,
} from "lucide-react";

export interface InvoiceItem {
  id?: string;
  productName: string;
  brand?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  serials?: string[];
  warranty?: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  createdAt: string | Date;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  cashierName?: string | null;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  payments?: Array<{ method: string; amount: number; referenceNumber?: string }>;
  cashTendered?: number;
  changeDue?: number;
  notes?: string | null;
}

export interface CashMemoShopSettings {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  tagline?: string;
  receiptHeader?: string;
  receiptFooter?: string;
}

interface CashMemoProps {
  invoice: InvoiceData;
  onClose?: () => void;
  onNewSale?: () => void;
  extraActions?: React.ReactNode;
  initialMode?: "thermal" | "standard";
  shopSettings?: CashMemoShopSettings;
}

const DEFAULT_SHOP_INFO: CashMemoShopSettings = {
  name: "রাশেদ টেলিকম",
  tagline: "মোবাইল বিক্রয়, সার্ভিসিং ও আধুনিক এক্সেসরিজ",
  address: "কালিয়াকৈর বাজার, কালিয়াকৈর, গাজীপুর",
  phone: "01521378476",
  email: "rashedsarkarofficial@gmail.com",
};

// Generate formatted invoice text for sharing
export function generateInvoiceShareText(
  invoice: InvoiceData,
  shopInfo: CashMemoShopSettings,
  targetPhone?: string
): string {
  const dateFormatted = formatDateTimeDhaka(new Date(invoice.createdAt));
  const itemsList = invoice.items
    .map((item, idx) => {
      const itemLine = `${idx + 1}. ${item.productName} (${item.quantity} x ${formatBDT(item.unitPrice)}) = ${formatBDT(item.subtotal)}`;
      const serialLine = item.serials && item.serials.length > 0 ? `\n   IMEI/Serial: ${item.serials.join(", ")}` : "";
      return `${itemLine}${serialLine}`;
    })
    .join("\n");

  const phone = targetPhone || invoice.customerPhone;

  return `🧾 *${shopInfo.name || "রাশেদ টেলিকম"}*
ক্যাশ মেমো / বিক্রয় রসিদ
━━━━━━━━━━━━━━━━━━━━
📄 মেমো নং: ${invoice.invoiceNumber}
📅 তারিখ: ${dateFormatted}
👤 গ্রাহক: ${invoice.customerName || "ওয়াক-ইন কাস্টমার"}
${phone ? `📱 মোবাইল: ${phone}\n` : ""}${invoice.customerAddress ? `🏠 ঠিকানা: ${invoice.customerAddress}\n` : ""}━━━━━━━━━━━━━━━━━━━━
📦 পণ্য বিবরণ:
${itemsList}
━━━━━━━━━━━━━━━━━━━━
💵 উপমোট (Subtotal): ${formatBDT(invoice.subtotal)}
${invoice.discount > 0 ? `🎁 ছাড় (Discount): -${formatBDT(invoice.discount)}\n` : ""}💰 সর্বমোট বিল (Net Total): ${formatBDT(invoice.totalAmount)}
✅ পরিশোধিত (Paid): ${formatBDT(invoice.paidAmount)}
${invoice.dueAmount > 0 ? `🔴 বকেয়া (Due): ${formatBDT(invoice.dueAmount)}\n` : ""}${invoice.changeDue !== undefined && invoice.changeDue > 0 ? `↩️ ফেরত (Change): ${formatBDT(invoice.changeDue)}\n` : ""}কথায়: ${numberToBengaliWords(invoice.totalAmount)}
━━━━━━━━━━━━━━━━━━━━
📍 ঠিকানা: ${shopInfo.address || "কালিয়াকৈর বাজার, কালিয়াকৈর, গাজীপুর"}
📞 হেল্পলাইন: ${shopInfo.phone || "01521378476"}
আমাদের সাথে থাকার জন্য ধন্যবাদ! আবার আসবেন।`;
}

// Helper to convert Bengali / English number to Bengali words for Cash Memo
export function numberToBengaliWords(amount: number): string {
  const ones = [
    "", "এক", "দুই", "তিন", "চার", "পাঁচ", "ছয়", "সাত", "আট", "নয়", "দশ",
    "এগারো", "বারো", "তেরো", "চৌদ্দ", "পনেরো", "ষোলো", "সতেরো", "আঠারো", "উনিশ", "বিশ",
    "একুশ", "বাইশ", "তেইশ", "চব্বিশ", "পঁচিশ", "ছাব্বিশ", "সাতাশ", "আঠাশ", "ঊনত্রিশ", "ত্রিশ",
    "একত্রিশ", "বত্রিশ", "তেত্রিশ", "চৌত্রিশ", "পঁয়ত্রিশ", "ছত্রিশ", "সাঁইত্রিশ", "আটত্রিশ", "ঊনচল্লিশ", "চল্লিশ",
    "একচল্লিশ", "বিয়াল্লিশ", "তেতাল্লিশ", "চুয়াল্লিশ", "পঁয়তাল্লিশ", "ছেচল্লিশ", "সাতচল্লিশ", "আটচল্লিশ", "ঊনপঞ্চাশ", "পঞ্চাশ",
    "একান্ন", "বায়ান্ন", "তিপ্পান্ন", "চুয়ান্ন", "পঞ্চান্ন", "ছাপ্পান্ন", "সাতান্ন", "আটান্ন", "ঊনষাট", "ষাট",
    "একষট্টি", "বাষট্টি", "তেষট্টি", "চৌষট্টি", "পঁয়ষট্টি", "ছেষট্টি", "সাতষট্টি", "আটষট্টি", "ঊনসত্তর", "সত্তর",
    "একাত্তর", "বাহাত্তর", "তিয়াত্তর", "চুয়াত্তর", "পঁচাত্তর", "ছিয়াত্তর", "সাতাত্তর", "আটাত্তর", "ঊনআশি", "আশি",
    "একাশি", "বিরাশি", "তিরাশি", "চুরাশি", "পঁচাশি", "ছিয়াশি", "সাতাশি", "অষ্টআশি", "ঊননব্বই", "নব্বই",
    "একানব্বই", "বিরানব্বই", "তিরানব্বই", "চুরানব্বই", "পঁচানব্বই", "ছিয়ানব্বই", "সাতানব্বই", "আটানব্বই", "নিরানব্বই"
  ];

  if (!amount || amount <= 0) return "শূন্য টাকা মাত্র";
  let num = Math.floor(amount);
  let words = "";

  if (num >= 10000000) {
    const crore = Math.floor(num / 10000000);
    words += `${numberToBengaliWords(crore).replace(" টাকা মাত্র", "")} কোটি `;
    num %= 10000000;
  }
  if (num >= 100000) {
    const lakh = Math.floor(num / 100000);
    words += `${ones[lakh] || lakh} লাখ `;
    num %= 100000;
  }
  if (num >= 1000) {
    const thousand = Math.floor(num / 1000);
    words += `${ones[thousand] || thousand} হাজার `;
    num %= 1000;
  }
  if (num >= 100) {
    const hundred = Math.floor(num / 100);
    words += `${ones[hundred] || hundred} শত `;
    num %= 100;
  }
  if (num > 0) {
    words += `${ones[num] || num} `;
  }

  return `${words.trim()} টাকা মাত্র`;
}

export function CashMemo({
  invoice,
  onClose,
  onNewSale,
  extraActions,
  initialMode = "thermal",
  shopSettings,
}: CashMemoProps) {
  const [printMode, setPrintMode] = useState<"thermal" | "standard">(initialMode);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharePhone, setSharePhone] = useState(invoice.customerPhone || "");
  const [copied, setCopied] = useState(false);

  // Dynamic shop info state (defaults to provided prop or fallback, synchronizes with settings/localStorage)
  const [liveSettings, setLiveSettings] = useState<CashMemoShopSettings | null>(shopSettings || null);

  useEffect(() => {
    if (shopSettings) {
      setLiveSettings(shopSettings);
    } else {
      // 1. Try reading cached settings from localStorage
      try {
        const cached = localStorage.getItem("shop_settings");
        const cachedName = localStorage.getItem("shop_name");
        if (cached) {
          const parsed = JSON.parse(cached);
          setLiveSettings({
            name: cachedName || DEFAULT_SHOP_INFO.name,
            address: parsed.address || DEFAULT_SHOP_INFO.address,
            phone: parsed.phone || DEFAULT_SHOP_INFO.phone,
            email: parsed.email || DEFAULT_SHOP_INFO.email,
            tagline: parsed.receiptHeader?.split("\n")[1] || DEFAULT_SHOP_INFO.tagline,
            receiptHeader: parsed.receiptHeader,
            receiptFooter: parsed.receiptFooter,
          });
        }
      } catch { }

      // 2. Fetch fresh shop settings from API
      fetch("/api/v1/settings?shopId=11111111-1111-1111-1111-111111111111")
        .then((res) => res.json())
        .then((json) => {
          if (json?.data) {
            const data = json.data;
            const s = data.settings || {};
            setLiveSettings({
              name: data.name || DEFAULT_SHOP_INFO.name,
              address: s.address || DEFAULT_SHOP_INFO.address,
              phone: s.phone || DEFAULT_SHOP_INFO.phone,
              email: s.email || DEFAULT_SHOP_INFO.email,
              tagline: s.receiptHeader?.split("\n")[1] || DEFAULT_SHOP_INFO.tagline,
              receiptHeader: s.receiptHeader,
              receiptFooter: s.receiptFooter,
            });
          }
        })
        .catch(() => { });
    }

    // 3. Listen to live updates whenever settings are saved in settings view
    const handleSettingsUpdated = (e: any) => {
      const detail = e.detail;
      if (detail) {
        setLiveSettings({
          name: detail.name || DEFAULT_SHOP_INFO.name,
          address: detail.settings?.address || DEFAULT_SHOP_INFO.address,
          phone: detail.settings?.phone || DEFAULT_SHOP_INFO.phone,
          email: detail.settings?.email || DEFAULT_SHOP_INFO.email,
          tagline: detail.settings?.receiptHeader?.split("\n")[1] || DEFAULT_SHOP_INFO.tagline,
          receiptHeader: detail.settings?.receiptHeader,
          receiptFooter: detail.settings?.receiptFooter,
        });
      }
    };

    window.addEventListener("shop_settings_updated", handleSettingsUpdated);
    return () => {
      window.removeEventListener("shop_settings_updated", handleSettingsUpdated);
    };
  }, [shopSettings]);

  // Resolved dynamic shop information
  const activeShopInfo = {
    name: liveSettings?.name || shopSettings?.name || DEFAULT_SHOP_INFO.name!,
    tagline: liveSettings?.tagline || shopSettings?.tagline || DEFAULT_SHOP_INFO.tagline!,
    address: liveSettings?.address || shopSettings?.address || DEFAULT_SHOP_INFO.address!,
    phone: liveSettings?.phone || shopSettings?.phone || DEFAULT_SHOP_INFO.phone!,
    email: liveSettings?.email || shopSettings?.email || DEFAULT_SHOP_INFO.email!,
    receiptFooter: liveSettings?.receiptFooter || shopSettings?.receiptFooter,
  };

  const handlePrint = () => {
    window.print();
  };

  const paymentMethodLabel = (method: string) => {
    switch (method?.toUpperCase()) {
      case "CASH":
        return "ক্যাশ / নগদ";
      case "BKASH":
        return "বিকাশ (bKash)";
      case "NAGAD":
        return "নগদ (Nagad)";
      case "ROCKET":
        return "রকেট (Rocket)";
      case "BANK":
        return "ব্যাংক ট্রান্সফার";
      default:
        return method || "ক্যাশ";
    }
  };

  // Generate formatted invoice text for sharing
  const getShareText = () => generateInvoiceShareText(invoice, activeShopInfo, sharePhone);

  // 1. WhatsApp Share
  const handleWhatsAppShare = () => {
    const text = getShareText();
    const raw = (sharePhone || invoice.customerPhone || "").trim().replace(/[\s\-\(\)\+]/g, "");
    let targetPhone = "";
    if (raw) {
      if (raw.startsWith("880")) {
        targetPhone = raw;
      } else if (raw.startsWith("01")) {
        targetPhone = `88${raw}`;
      } else if (raw.startsWith("1") && raw.length === 10) {
        targetPhone = `880${raw}`;
      } else {
        targetPhone = raw;
      }
    }

    const encodedText = encodeURIComponent(text);
    const waUrl = targetPhone
      ? `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  // 2. Native Share API (Android/iOS System Share Sheet)
  const handleNativeShare = async () => {
    const text = getShareText();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${activeShopInfo.name} - মেমো ${invoice.invoiceNumber}`,
          text: text,
        });
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  // 3. Copy Memo Details to Clipboard
  const handleCopy = async () => {
    try {
      const text = getShareText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = getShareText();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // 4. SMS Direct
  const handleSmsShare = () => {
    const text = getShareText();
    const raw = (sharePhone || invoice.customerPhone || "").trim().replace(/[\s\-\(\)\+]/g, "");
    const smsUrl = raw
      ? `sms:${raw}?body=${encodeURIComponent(text)}`
      : `sms:?body=${encodeURIComponent(text)}`;
    window.location.href = smsUrl;
  };

  return (
    <div className="printable-modal-overlay fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Container wrapper */}
      <div className="w-full max-w-3xl bg-zinc-100 dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-300 dark:border-zinc-800 flex flex-col max-h-[96vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">

        {/* Top Control Bar (Screen Only - Hidden in Print) */}
        <div className="no-print bg-white dark:bg-zinc-950 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>বিক্রয় সম্পন্ন • ক্যাশ মেমো</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">
                  {invoice.invoiceNumber}
                </span>
              </h2>
              <p className="text-[11px] text-zinc-500">প্রিন্ট অথবা শেয়ার করার পূর্বে মেমোর প্রিভিউ যাচাই করুন</p>
            </div>
          </div>

          {/* Mode Switcher & Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Thermal vs A4 toggle */}
            <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs">
              <button
                type="button"
                onClick={() => setPrintMode("thermal")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${printMode === "thermal"
                    ? "bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                  }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>থার্মাল (80mm)</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintMode("standard")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${printMode === "standard"
                    ? "bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                  }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>ক্লাসিক মেমো (A4/A5)</span>
              </button>
            </div>

            {extraActions}

            {/* Share Button */}
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/25 active:scale-95 transition-all"
              title="ইনভয়েস শেয়ার করুন (WhatsApp, SMS, কপি)"
            >
              <Share2 className="w-4 h-4" />
              <span>শেয়ার</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/25 active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট মেমো</span>
            </button>

            {onNewSale && (
              <button
                type="button"
                onClick={onNewSale}
                className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>নতুন বিক্রয়</span>
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                title="বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Receipt Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center bg-zinc-200/70 dark:bg-zinc-950/70">

          {/* ============================================================ */}
          {/* THE PRINTABLE MEMO (Targeted by window.print via ID) */}
          {/* ============================================================ */}
          <div
            id="printable-memo"
            className={`bg-white text-zinc-950 shadow-xl transition-all ${printMode === "thermal"
                ? "print-mode-thermal w-full max-w-[340px] p-5 font-mono text-[11px] rounded-2xl border border-zinc-300"
                : "print-mode-standard w-full max-w-2xl p-7 text-xs rounded-2xl border border-zinc-300"
              }`}
          >
            {printMode === "thermal" ? (
              /* ======================================================= */
              /* LAYOUT 1: POS THERMAL RECEIPT (80mm)                    */
              /* ======================================================= */
              <div className="space-y-3 leading-relaxed">
                {/* Header (Bangla Only, Dynamic Address & Phone from Settings) */}
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-zinc-400">
                  <div className="text-base font-black tracking-wide text-zinc-950">{activeShopInfo.name}</div>
                  <div className="text-[10px] text-zinc-600 font-medium">{activeShopInfo.tagline}</div>
                  <div className="text-[9.5px] text-zinc-500 leading-snug">{activeShopInfo.address}</div>
                  <div className="text-[9.5px] text-zinc-800 font-bold">ফোন: {activeShopInfo.phone}</div>
                </div>

                {/* Receipt Title & Meta */}
                <div className="py-1 text-center font-bold tracking-widest text-[11px] bg-zinc-100 uppercase border-y border-dashed border-zinc-300">
                  *** ক্যাশ মেমো / রসিদ ***
                </div>

                <div className="space-y-1 text-[10px] pb-2 border-b border-dashed border-zinc-300">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">মেমো নং:</span>
                    <span className="font-bold">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">তারিখ ও সময়:</span>
                    <span className="font-medium">{formatDateTimeDhaka(new Date(invoice.createdAt))}</span>
                  </div>
                  {invoice.cashierName && (
                    <div className="flex justify-between">
                      <span className="text-zinc-600">ক্যাশিয়ার:</span>
                      <span>{invoice.cashierName}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-0.5">
                    <span className="text-zinc-600">গ্রাহক:</span>
                    <span className="font-bold text-right truncate max-w-[170px]">
                      {invoice.customerName || "ওয়াক-ইন কাস্টমার"}
                    </span>
                  </div>
                  {invoice.customerPhone && (
                    <div className="flex justify-between">
                      <span className="text-zinc-600">মোবাইল:</span>
                      <span className="font-mono">{invoice.customerPhone}</span>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="space-y-2 py-1">
                  <div className="flex justify-between font-black text-[10px] pb-1 border-b border-zinc-400 uppercase">
                    <span className="w-7/12">বিবরণ (Item)</span>
                    <span className="w-2/12 text-center">পরিমাণ</span>
                    <span className="w-3/12 text-right">মূল্য</span>
                  </div>

                  {invoice.items.map((item, idx) => (
                    <div key={idx} className="space-y-0.5 pb-1.5 border-b border-zinc-200 last:border-b-0">
                      <div className="flex justify-between items-start">
                        <div className="w-7/12 pr-1 font-bold text-[11px] text-zinc-950 leading-tight">
                          {item.productName}
                        </div>
                        <div className="w-2/12 text-center text-[10px] font-mono">
                          {item.quantity}
                        </div>
                        <div className="w-3/12 text-right font-bold text-[11px] font-mono">
                          {formatBDT(item.subtotal)}
                        </div>
                      </div>

                      {/* Serials / IMEI */}
                      {item.serials && item.serials.length > 0 && (
                        <div className="text-[9px] text-zinc-600 font-mono bg-zinc-50 p-1 rounded">
                          IMEI: {item.serials.join(", ")}
                        </div>
                      )}

                      {/* Rate detail if qty > 1 */}
                      {item.quantity > 1 && (
                        <div className="text-[9px] text-zinc-500">
                          ({item.quantity} x {formatBDT(item.unitPrice)})
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Financial Summary */}
                <div className="pt-2 border-t-2 border-dashed border-zinc-400 space-y-1 text-[11px]">
                  <div className="flex justify-between text-zinc-700">
                    <span>উপমোট (Subtotal):</span>
                    <span className="font-mono font-medium">{formatBDT(invoice.subtotal)}</span>
                  </div>

                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>ছাড় (Discount):</span>
                      <span className="font-mono font-bold">-{formatBDT(invoice.discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-xs font-black text-zinc-950 pt-1 border-t border-zinc-300">
                    <span>সর্বমোট বিল (Net Total):</span>
                    <span className="font-mono">{formatBDT(invoice.totalAmount)}</span>
                  </div>

                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>পরিশোধিত (Paid):</span>
                    <span className="font-mono">{formatBDT(invoice.paidAmount)}</span>
                  </div>

                  {/* Payment Methods breakdown */}
                  {invoice.payments && invoice.payments.length > 0 && (
                    <div className="text-[9.5px] text-zinc-600 pl-2 border-l border-zinc-300 my-0.5 space-y-0.5">
                      {invoice.payments.map((p, pIdx) => (
                        <div key={pIdx} className="flex justify-between">
                          <span>• {paymentMethodLabel(p.method)}:</span>
                          <span className="font-mono">{formatBDT(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {invoice.dueAmount > 0 && (
                    <div className="flex justify-between text-rose-600 font-black pt-0.5 border-t border-dashed border-rose-300">
                      <span>বকেয়া (Due Amount):</span>
                      <span className="font-mono">{formatBDT(invoice.dueAmount)}</span>
                    </div>
                  )}

                  {invoice.changeDue !== undefined && invoice.changeDue > 0 && (
                    <div className="flex justify-between text-blue-700 font-semibold pt-0.5">
                      <span>ফেরত দেওয়া হয়েছে (Change):</span>
                      <span className="font-mono">{formatBDT(invoice.changeDue)}</span>
                    </div>
                  )}
                </div>

                {/* Amount in words */}
                <div className="pt-1.5 pb-2 text-[9.5px] text-zinc-600 border-t border-dashed border-zinc-300">
                  <span className="font-bold">কথায়: </span>
                  <span>{numberToBengaliWords(invoice.totalAmount)}</span>
                </div>

                {/* Terms and conditions */}
                <div className="text-center text-[9px] text-zinc-600 pt-2 border-t border-dashed border-zinc-400 space-y-1 leading-snug">
                  <div>* বিক্রিত পণ্য ৭ দিনের মধ্যে অক্ষত অবস্থায় পরিবর্তনযোগ্য।</div>
                  <div>* ওয়ারেন্টির জন্য মেমো প্রদর্শন আবশ্যক।</div>
                  <div className="font-bold text-[9.5px] text-zinc-900 pt-1">
                    আমাদের সাথে থাকার জন্য ধন্যবাদ! আবার আসবেন।
                  </div>
                </div>

                {/* Barcode Mock */}
                <div className="pt-2 text-center">
                  <div className="inline-block tracking-[4px] font-black text-sm uppercase px-3 py-1 bg-zinc-950 text-white rounded">
                    ||||| {invoice.invoiceNumber} |||||
                  </div>
                </div>
              </div>
            ) : (
              /* ======================================================= */
              /* LAYOUT 2: CLASSIC A4 / A5 PAD INVOICE MEMO             */
              /* ======================================================= */
              <div className="space-y-5 leading-normal">
                {/* Header Pad (Bangla Only, Dynamic Address from Settings) */}
                <div className="flex items-start justify-between border-b-2 border-zinc-900 pb-4">
                  <div className="space-y-1">
                    <div className="inline-block px-2.5 py-0.5 rounded bg-zinc-950 text-white text-[10px] font-bold tracking-widest uppercase mb-1">
                      মোবাইল ও এক্সেসরিজ ক্যাশ মেমো
                    </div>
                    <h1 className="text-2xl font-black text-zinc-950 tracking-tight">
                      {activeShopInfo.name}
                    </h1>
                    <p className="text-[11px] text-zinc-600 font-medium">{activeShopInfo.tagline}</p>
                    <p className="text-[11px] text-zinc-500">{activeShopInfo.address}</p>
                    <p className="text-[11px] font-semibold text-zinc-800">
                      📞 হেল্পলাইন: {activeShopInfo.phone}{activeShopInfo.email ? ` | ✉️ ${activeShopInfo.email}` : ""}
                    </p>
                  </div>

                  {/* Memo Badge */}
                  <div className="text-right space-y-1 border border-zinc-300 p-3 rounded-xl bg-zinc-50 min-w-[190px]">
                    <div className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                      ইনভয়েস / চালান
                    </div>
                    <div className="text-base font-black font-mono text-zinc-950">
                      {invoice.invoiceNumber}
                    </div>
                    <div className="text-[11px] text-zinc-600">
                      তারিখ: {formatDateTimeDhaka(new Date(invoice.createdAt))}
                    </div>
                    <div className="pt-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${invoice.dueAmount <= 0
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-rose-100 text-rose-800 border border-rose-300"
                        }`}>
                        {invoice.dueAmount <= 0 ? "পরিশোধিত (PAID)" : "বকেয়া (DUE)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Customer & Cashier Info Block */}
                <div className="grid grid-cols-2 gap-4 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 text-xs">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                      গ্রাহকের বিবরণ (Customer Details)
                    </div>
                    <div className="font-bold text-zinc-950 text-sm">
                      {invoice.customerName || "ওয়াক-ইন কাস্টমার (নগদ ক্রেতা)"}
                    </div>
                    {invoice.customerPhone && (
                      <div className="text-zinc-600 font-mono mt-0.5">
                        মোবাইল: {invoice.customerPhone}
                      </div>
                    )}
                    {invoice.customerAddress && (
                      <div className="text-zinc-500 mt-0.5">
                        ঠিকানা: {invoice.customerAddress}
                      </div>
                    )}
                  </div>

                  <div className="text-right flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                        বিক্রয় কেন্দ্র ও প্রতিনিধি
                      </div>
                      <div className="font-semibold text-zinc-900">
                        {activeShopInfo.name} শোরুম
                      </div>
                      <div className="text-zinc-600">
                        ক্যাশিয়ার: {invoice.cashierName || "অ্যাডমিন"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-hidden border border-zinc-300 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 border-b border-zinc-300 text-[11px] font-bold text-zinc-700 uppercase">
                        <th className="py-2.5 px-3 w-10 text-center">ক্র.</th>
                        <th className="py-2.5 px-3">পণ্যের বিবরণ (Item & Details)</th>
                        <th className="py-2.5 px-3 text-center w-16">পরিমাণ</th>
                        <th className="py-2.5 px-3 text-right w-24">দর (Rate)</th>
                        <th className="py-2.5 px-3 text-right w-28">মোট টাকা</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 text-xs">
                      {invoice.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/50">
                          <td className="py-2 px-3 text-center text-zinc-500 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-zinc-900">{item.productName}</div>
                            {item.serials && item.serials.length > 0 && (
                              <div className="text-[10px] text-zinc-600 font-mono mt-0.5">
                                IMEI / Serial: {item.serials.join(", ")}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-medium">
                            {item.quantity}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-zinc-700">
                            {formatBDT(item.unitPrice)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-zinc-950">
                            {formatBDT(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Calculation & Notes Block */}
                <div className="grid grid-cols-12 gap-6 pt-1">
                  {/* Left Column: Words, Terms */}
                  <div className="col-span-7 space-y-3">
                    <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs">
                      <span className="font-bold text-zinc-700">কথায়: </span>
                      <span className="font-medium text-zinc-900">
                        {numberToBengaliWords(invoice.totalAmount)}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border border-dashed border-zinc-300 text-[10.5px] text-zinc-600 space-y-1">
                      <div className="font-bold text-zinc-800">শর্তাবলী:</div>
                      <div>১. বিক্রিত পণ্য অক্ষত অবস্থায় ৭ দিনের মধ্যে পরিবর্তনের সুযোগ রয়েছে।</div>
                      <div>২. ওয়ারেন্টির যেকোনো দাবির জন্য ক্যাশ মেমো প্রদর্শন বাধ্যতামূলক।</div>
                      <div>৩. ডিসপ্লে, টাচ ও পানিতে পড়া পণ্যে ওয়ারেন্টি প্রযোজ্য নয়।</div>
                    </div>
                  </div>

                  {/* Right Column: Totals */}
                  <div className="col-span-5 bg-zinc-50 p-4 rounded-xl border border-zinc-300 space-y-2 text-xs">
                    <div className="flex justify-between text-zinc-600">
                      <span>উপমোট (Subtotal):</span>
                      <span className="font-mono font-medium">{formatBDT(invoice.subtotal)}</span>
                    </div>

                    {invoice.discount > 0 && (
                      <div className="flex justify-between text-rose-600 font-medium">
                        <span>বিশেষ ছাড় (Discount):</span>
                        <span className="font-mono">-{formatBDT(invoice.discount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between font-black text-sm text-zinc-950 pt-2 border-t border-zinc-300">
                      <span>সর্বমোট প্রদেয় (Total):</span>
                      <span className="font-mono">{formatBDT(invoice.totalAmount)}</span>
                    </div>

                    <div className="flex justify-between font-bold text-emerald-800">
                      <span>পরিশোধিত অর্থ (Paid):</span>
                      <span className="font-mono">{formatBDT(invoice.paidAmount)}</span>
                    </div>

                    {invoice.payments && invoice.payments.length > 0 && (
                      <div className="text-[10px] text-zinc-600 pl-2 border-l-2 border-zinc-300 space-y-0.5">
                        {invoice.payments.map((p, pIdx) => (
                          <div key={pIdx} className="flex justify-between">
                            <span>{paymentMethodLabel(p.method)}:</span>
                            <span className="font-mono">{formatBDT(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {invoice.dueAmount > 0 && (
                      <div className="flex justify-between font-black text-rose-600 pt-1 border-t border-dashed border-rose-300">
                        <span>বকেয়া (Due Balance):</span>
                        <span className="font-mono">{formatBDT(invoice.dueAmount)}</span>
                      </div>
                    )}

                    {invoice.changeDue !== undefined && invoice.changeDue > 0 && (
                      <div className="flex justify-between text-blue-700 font-semibold pt-1">
                        <span>ফেরত দেওয়া হয়েছে:</span>
                        <span className="font-mono">{formatBDT(invoice.changeDue)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Signatures */}
                <div className="pt-8 flex justify-between items-end text-xs text-zinc-600">
                  <div className="text-center w-40">
                    <div className="border-t border-dashed border-zinc-400 pt-1.5 font-medium">
                      ক্রেতার স্বাক্ষর
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[11px] font-bold text-zinc-800 mb-1">
                      {activeShopInfo.name}
                    </div>
                    <div className="text-center w-44">
                      <div className="border-t border-dashed border-zinc-400 pt-1.5 font-bold text-zinc-900">
                        অনুমোদিত স্বাক্ষর ও সিল
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Status / Tip Bar (Screen Only - Hidden in Print) */}
        <div className="no-print bg-white dark:bg-zinc-950 px-4 py-2.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>প্রিন্ট শর্টকাট: <kbd className="font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border text-[10px]">Ctrl + P</kbd></span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>ইনভয়েস শেয়ার করুন</span>
            </button>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <button
              type="button"
              onClick={handlePrint}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>এখনই প্রিন্ট করুন</span>
            </button>
          </div>
        </div>

      </div>

      {/* ============================================================ */}
      {/* 5. INVOICE SHARE MODAL DIALOG                                */}
      {/* ============================================================ */}
      {isShareModalOpen && (
        <div className="no-print fixed inset-0 z-60 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-zinc-950 dark:text-white flex items-center gap-2">
                    <span>ইনভয়েস শেয়ার করুন</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-bold">
                      {invoice.invoiceNumber}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500">গ্রাহকের হোয়াটসঅ্যাপ, মেসেজ বা অন্যান্য মাধ্যমে মেমো পাঠান</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Customer Phone Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>গ্রাহকের ফোন / হোয়াটসঅ্যাপ নম্বর:</span>
                  <span className="text-[10px] text-zinc-500">পরিবর্তনযোগ্য</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={sharePhone}
                    onChange={(e) => setSharePhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Share Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* 1. WhatsApp Direct */}
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-left transition-all group flex items-start gap-3 active:scale-98"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-emerald-950 dark:text-emerald-200 text-xs flex items-center gap-1">
                      <span>হোয়াটসঅ্যাপ (WhatsApp)</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 leading-snug">
                      সরাসরি কাস্টমারের চ্যাটে মেমো পাঠান
                    </p>
                  </div>
                </button>

                {/* 2. Native Share / Other Apps */}
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 text-left transition-all group flex items-start gap-3 active:scale-98"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-blue-950 dark:text-blue-200 text-xs">
                      ডিভাইস শেয়ার (Share Sheet)
                    </p>
                    <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5 leading-snug">
                      মেসেঞ্জার, টেলিগ্রাম, ব্লুটুথ ইত্যাদি
                    </p>
                  </div>
                </button>

                {/* 3. Copy Text */}
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`p-3.5 rounded-xl border text-left transition-all group flex items-start gap-3 active:scale-98 ${copied
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100"
                      : "border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750"
                    }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform ${copied
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-800 dark:bg-zinc-700 text-white group-hover:scale-105"
                      }`}
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      {copied ? "কপি সম্পন্ন হয়েছে!" : "মেমোর টেক্সট কপি"}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                      {copied ? "ক্লিপবোর্ডে কপি করা হয়েছে" : "কপি করে যেকোনো জায়গায় পেস্ট করুন"}
                    </p>
                  </div>
                </button>

                {/* 4. SMS Direct */}
                <button
                  type="button"
                  onClick={handleSmsShare}
                  className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 text-left transition-all group flex items-start gap-3 active:scale-98"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <Send className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-indigo-950 dark:text-indigo-200 text-xs">
                      এসএমএস (SMS) পাঠান
                    </p>
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5 leading-snug">
                      মোবাইলের সাধারণ মেসেজ আকারে
                    </p>
                  </div>
                </button>
              </div>

              {/* Message Live Preview (Collapsible Box) */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 font-semibold text-[11px]">
                  <span>শেয়ারকৃত বার্তার প্রিভিউ (Message Preview):</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "কপি হয়েছে" : "কপি"}</span>
                  </button>
                </div>
                <div className="p-3 bg-zinc-100 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 max-h-44 overflow-y-auto font-mono text-[11px] whitespace-pre-wrap leading-relaxed text-zinc-800 dark:text-zinc-200 select-all">
                  {getShareText()}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500">
                গ্রাহককে ডিজিটাল মেমো পৌঁছে দেওয়ার নিরাপদ মাধ্যম
              </span>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs transition-colors"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
