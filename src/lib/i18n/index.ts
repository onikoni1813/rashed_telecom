import { Locale } from "@/types";

export const translations = {
  bn: {
    shopName: "রাশেদ টেলিকম",
    tagline: "টেলিকম ও মোবাইল সার্ভিসিং ম্যানেজমেন্ট",
    currencySymbol: "৳",
    nav: {
      dashboard: "ড্যাশবোর্ড",
      pos: "বিক্রয় কেন্দ্র (POS)",
      products: "পণ্য তালিকা",
      inventory: "মজুদ পণ্য",
      purchases: "ক্রয় ব্যবস্থাপনা",
      servicing: "মোবাইল সার্ভিসিং",
      customers: "গ্রাহকবৃন্দ",
      suppliers: "সরবরাহকারী",
      expenses: "খরচের হিসাব",
      accounts: "অ্যাকাউন্টিং",
      dues: "বকেয়া তালিকা",
      reports: "প্রতিবেদনসমূহ",
      settings: "সেটিংস",
      more: "আরও",
      home: "হোম",
    },
    status: {
      active: "সক্রিয়",
      inactive: "নিষ্ক্রিয়",
      pending: "অপেক্ষমান",
      completed: "সম্পন্ন",
      cancelled: "বাতিল",
      inProgress: "চলমান",
      ready: "প্রস্তুত",
      delivered: "বিতরণ করা হয়েছে",
    },
    common: {
      search: "অনুসন্ধান...",
      filter: "ফিল্টার",
      export: "এক্সপোর্ট",
      refresh: "রিফ্রেশ",
      save: "সংরক্ষণ করুন",
      cancel: "বাতিল",
      delete: "মুছে ফেলুন",
      edit: "সম্পাদনা",
      view: "দেখুন",
      actions: "পদক্ষেপ",
      loading: "লোড হচ্ছে...",
      noData: "কোন তথ্য পাওয়া যায়নি",
      english: "English",
      bengali: "বাংলা",
      offlineMode: "অফলাইন ড্রাফট সক্রিয়",
      online: "অনলাইন",
      timezone: "এশিয়া/ঢাকা",
    },
  },
  en: {
    shopName: "Rashed Telecom",
    tagline: "Telecom & Mobile Servicing Shop Management",
    currencySymbol: "৳",
    nav: {
      dashboard: "Dashboard",
      pos: "Point of Sale (POS)",
      products: "Products",
      inventory: "Inventory",
      purchases: "Purchases",
      servicing: "Mobile Servicing",
      customers: "Customers",
      suppliers: "Suppliers",
      expenses: "Expenses",
      accounts: "Accounting",
      dues: "Dues & Payables",
      reports: "Reports",
      settings: "Settings",
      more: "More",
      home: "Home",
    },
    status: {
      active: "Active",
      inactive: "Inactive",
      pending: "Pending",
      completed: "Completed",
      cancelled: "Cancelled",
      inProgress: "In Progress",
      ready: "Ready",
      delivered: "Delivered",
    },
    common: {
      search: "Search...",
      filter: "Filter",
      export: "Export",
      refresh: "Refresh",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      view: "View",
      actions: "Actions",
      loading: "Loading...",
      noData: "No records found",
      english: "English",
      bengali: "বাংলা",
      offlineMode: "Offline Draft Mode Active",
      online: "Online",
      timezone: "Asia/Dhaka",
    },
  },
} as const;

export function getDictionary(locale: Locale = "bn") {
  return translations[locale] || translations.bn;
}

const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBengaliNumerals(input: string | number): string {
  return String(input).replace(/[0-9]/g, (digit) => bengaliDigits[Number(digit)]);
}

/**
 * Format amounts in Bangladeshi Taka (BDT ৳)
 * @param amount Number or numeric string
 * @param locale Locale ('bn' | 'en')
 */
export function formatBDT(amount: number | string, locale: Locale = "en"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "৳ 0.00";

  const formattedNumber = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  if (locale === "bn") {
    return `৳ ${toBengaliNumerals(formattedNumber)}`;
  }

  return `৳ ${formattedNumber}`;
}

/**
 * Format timestamps strictly in Asia/Dhaka timezone
 */
export function formatDhakaDate(
  date: Date | string | number,
  locale: Locale = "en",
  includeTime: boolean = true
): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }
      : {}),
  };

  const formatted = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", options).format(d);
  return formatted;
}

export const formatDateTimeDhaka = formatDhakaDate;

