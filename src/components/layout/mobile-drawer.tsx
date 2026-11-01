"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  ShoppingBag,
  Wrench,
  Users,
  Truck,
  BookOpen,
  AlertCircle,
  BarChart3,
  Settings,
  Receipt,
  UserCheck,
  ShieldCheck,
  FileText,
  SlidersHorizontal,
  X,
  Search,
  ChevronRight,
  Loader2,
  LucideIcon,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Locale } from "@/types";
import { useNavigation } from "./navigation-context";

export interface DrawerItemConfig {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  badgeColor: string;
}

export interface DrawerSection {
  title: string;
  items: DrawerItemConfig[];
}

const DRAWER_SECTIONS: DrawerSection[] = [
  {
    title: "মূল ব্যবসা ও সেলস",
    items: [
      {
        href: "/app",
        label: "ড্যাশবোর্ড",
        description: "সার্বিক বিক্রয়, আয় ও স্টকের সারসংক্ষেপ",
        icon: LayoutDashboard,
        badgeColor: "from-blue-500 to-indigo-600",
      },
      {
        href: "/app/pos",
        label: "POS কাউন্টার",
        description: "দ্রুত বিলিং, বারকোড ও নগদ/বিকাশ বিক্রয়",
        icon: ShoppingCart,
        badgeColor: "from-blue-600 to-cyan-500",
      },
      {
        href: "/app/products",
        label: "পণ্য তালিকা",
        description: "আইটেম ব্যবস্থাপনা, দাম ও ক্যাটাগরি",
        icon: Package,
        badgeColor: "from-purple-500 to-indigo-600",
      },
      {
        href: "/app/inventory",
        label: "ইনভেন্টরি স্টক",
        description: "বর্তমান স্টক লেভেল ও ইন-আউট ট্র্যাকিং",
        icon: Warehouse,
        badgeColor: "from-teal-500 to-emerald-600",
      },
      {
        href: "/app/purchases",
        label: "কেনাকাটা ও পারচেজ",
        description: "সাপ্লায়ার ইনভয়েস ও পণ্য ক্রয় হিসাব",
        icon: ShoppingBag,
        badgeColor: "from-sky-500 to-blue-600",
      },
    ],
  },
  {
    title: "সার্ভিসিং ও কাস্টমার",
    items: [
      {
        href: "/app/service",
        label: "মোবাইল সার্ভিসিং",
        description: "ডিভাইস মেরামত, প্যাটার্ন লক ও ডেলিভারি",
        icon: Wrench,
        badgeColor: "from-amber-500 to-orange-600",
      },
      {
        href: "/app/customers",
        label: "কাস্টমার তালিকা",
        description: "গ্রাহক তথ্য ও পূর্ববর্তী ক্রয়ের রেকর্ড",
        icon: Users,
        badgeColor: "from-indigo-500 to-blue-600",
      },
      {
        href: "/app/suppliers",
        label: "সাপ্লায়ার তালিকা",
        description: "মহাজন ও পাইকারি বিক্রেতাদের তথ্য",
        icon: Truck,
        badgeColor: "from-emerald-500 to-teal-600",
      },
    ],
  },
  {
    title: "হিসাব ও আর্থিক খাতা",
    items: [
      {
        href: "/app/expenses",
        label: "দোকান খরচ",
        description: "চা, বিদ্যুৎ বিল, ভাড়া ও দৈনিক খরচ",
        icon: Receipt,
        badgeColor: "from-rose-500 to-pink-600",
      },
      {
        href: "/app/accounts",
        label: "হিসাব খাতা",
        description: "ক্যাশ ইন, ক্যাশ আউট ও মোট স্থিতি",
        icon: BookOpen,
        badgeColor: "from-emerald-600 to-green-600",
      },
      {
        href: "/app/dues",
        label: "বাকি খাতা / বকেয়া",
        description: "কাস্টমার ও সাপ্লায়ার বকেয়া কালেকশন",
        icon: AlertCircle,
        badgeColor: "from-red-500 to-rose-600",
      },
    ],
  },
  {
    title: "প্রশাসন, রিপোর্ট ও সেটিংস",
    items: [
      {
        href: "/app/reports",
        label: "লাভ-ক্ষতি ও রিপোর্ট",
        description: "দৈনিক ও মাসিক নিট মুনাফা অ্যানালিটিক্স",
        icon: BarChart3,
        badgeColor: "from-pink-500 to-rose-600",
      },
      {
        href: "/app/staff",
        label: "স্টাফ ও কর্মী",
        description: "কর্মী তালিকা, হাজিরা ও অনুমতি",
        icon: UserCheck,
        badgeColor: "from-cyan-500 to-blue-600",
      },
      {
        href: "/app/approvals",
        label: "স্পেশাল অনুমোদন",
        description: "ডিসকাউন্ট ও বিশেষ ট্রানজ্যাকশন মঞ্জুরি",
        icon: ShieldCheck,
        badgeColor: "from-violet-500 to-purple-600",
      },
      {
        href: "/app/statements",
        label: "স্টেটমেন্ট ও চালান",
        description: "সকল বিক্রয় ও ক্রয়ের হিসাব খতিয়ান",
        icon: FileText,
        badgeColor: "from-emerald-500 to-teal-600",
      },
      {
        href: "/app/operations",
        label: "অপারেশন হিস্ট্রি",
        description: "সিস্টেম কার্যক্রম ও ট্রানজ্যাকশন লগ",
        icon: SlidersHorizontal,
        badgeColor: "from-slate-600 to-zinc-700",
      },
      {
        href: "/app/settings",
        label: "শপ সেটিংস",
        description: "দোকানের প্রোফাইল, প্রিন্টার ও নিরাপত্তা",
        icon: Settings,
        badgeColor: "from-zinc-500 to-slate-600",
      },
    ],
  },
];

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  locale?: Locale;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const { navigatingTarget, startNavigation } = useNavigation();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when pathname changes
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = "";
      setSearch("");
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter items if searching
  const normalizedSearch = search.trim().toLowerCase();
  const isSearching = normalizedSearch.length > 0;

  const allItems: DrawerItemConfig[] = DRAWER_SECTIONS.flatMap((s) => s.items);

  const filteredItems = isSearching
    ? allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(normalizedSearch) ||
          item.description.toLowerCase().includes(normalizedSearch) ||
          item.href.toLowerCase().includes(normalizedSearch)
      )
    : [];

  const handleItemClick = (href: string) => {
    startNavigation(href);
    onClose();
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      window.location.replace("/login");
    }
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside className="relative w-[85%] max-w-sm h-full bg-card/95 backdrop-blur-2xl border-r border-border/80 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200 ease-out select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/70 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-border bg-background shadow-2xs flex items-center justify-center">
              <Image
                src="/icons/icon-192.jpg"
                alt="Rashed Telecom"
                width={32}
                height={32}
                className="object-cover"
              />
            </div>
            <div>
              <div className="font-extrabold text-sm text-foreground leading-tight tracking-tight">
                রাশেদ টেলিকম
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight">
                সম্পূর্ণ শপ মেনু ও মডিউল
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors active:scale-95"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-3.5 py-2.5 border-b border-border/60 bg-muted/20">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-muted-foreground pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="মেনু খুঁজুন (যেমন: খরচ, বাকি, স্টক)..."
              className="w-full pl-9 pr-7 py-2 text-xs rounded-xl border border-border/80 bg-background/80 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 p-0.5 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Nav List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin">
          {isSearching ? (
            /* Search Results */
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-muted-foreground px-2 py-1 uppercase tracking-wider">
                সার্চ ফলাফল ({filteredItems.length})
              </div>
              {filteredItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  কোনো মেনু খুঁজে পাওয়া যায়নি
                </div>
              ) : (
                filteredItems.map((item) => (
                  <DrawerItemRow
                    key={item.href}
                    item={item}
                    currentPathname={pathname}
                    isNavigating={navigatingTarget === item.href}
                    onClick={() => handleItemClick(item.href)}
                  />
                ))
              )}
            </div>
          ) : (
            /* Grouped Sections */
            DRAWER_SECTIONS.map((section) => (
              <div key={section.title} className="space-y-1">
                <div className="text-[11px] font-bold text-muted-foreground/80 px-2 py-1 uppercase tracking-wider">
                  {section.title}
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <DrawerItemRow
                      key={item.href}
                      item={item}
                      currentPathname={pathname}
                      isNavigating={navigatingTarget === item.href}
                      onClick={() => handleItemClick(item.href)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer: Staff info & Lock */}
        <div className="p-3 border-t border-border/70 bg-muted/30">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all border border-rose-500/20 active:scale-98"
          >
            <LogOut className="w-4 h-4" />
            <span>টার্মিনাল লক / লগআউট</span>
          </button>
        </div>
      </aside>
    </div>
  );
}

interface DrawerItemRowProps {
  item: DrawerItemConfig;
  currentPathname: string;
  isNavigating: boolean;
  onClick: () => void;
}

function DrawerItemRow({
  item,
  currentPathname,
  isNavigating,
  onClick,
}: DrawerItemRowProps) {
  const Icon = item.icon;
  const isActive =
    item.href === "/app"
      ? currentPathname === "/app" || currentPathname === "/"
      : currentPathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      prefetch={true}
      onClick={onClick}
      className={cn(
        "group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all duration-150 touch-manipulation",
        isActive
          ? "bg-gradient-to-r from-primary to-indigo-600 text-white font-bold shadow-md shadow-primary/20 scale-[1.01]"
          : "text-foreground hover:bg-muted/70 active:scale-98"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
            isActive
              ? "bg-white/20 text-white shadow-inner"
              : `bg-muted/80 text-foreground group-hover:bg-gradient-to-tr ${item.badgeColor} group-hover:text-white`
          )}
        >
          {isNavigating ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Icon className="w-4 h-4" />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <span
            className={cn(
              "text-xs truncate leading-tight",
              isActive ? "text-white font-bold" : "font-semibold text-foreground"
            )}
          >
            {item.label}
          </span>
          <span
            className={cn(
              "text-[10px] truncate leading-tight mt-0.5",
              isActive ? "text-white/80" : "text-muted-foreground"
            )}
          >
            {item.description}
          </span>
        </div>
      </div>

      <div className="shrink-0 pl-2">
        {isNavigating ? (
          <span className="text-[10px] text-white/80 animate-pulse">খুলছে...</span>
        ) : (
          <ChevronRight
            className={cn(
              "w-4 h-4 transition-transform group-hover:translate-x-0.5",
              isActive ? "text-white/70" : "text-muted-foreground/50"
            )}
          />
        )}
      </div>
    </Link>
  );
}

