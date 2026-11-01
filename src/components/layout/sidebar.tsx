"use client";

import React, { useState, useEffect } from "react";
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
  LucideIcon,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Locale } from "@/types";
import { getDictionary } from "@/lib/i18n";
import { useNavigation } from "./navigation-context";

interface NavItemConfig {
  href: string;
  key: keyof ReturnType<typeof getDictionary>["nav"];
  icon: LucideIcon;
  badgeColor: string;
}

const NAV_ITEMS: NavItemConfig[] = [
  { href: "/app", key: "dashboard", icon: LayoutDashboard, badgeColor: "from-blue-500 to-indigo-600" },
  { href: "/app/pos", key: "pos", icon: ShoppingCart, badgeColor: "from-blue-600 to-cyan-500" },
  { href: "/app/products", key: "products", icon: Package, badgeColor: "from-purple-500 to-indigo-600" },
  { href: "/app/inventory", key: "inventory", icon: Warehouse, badgeColor: "from-teal-500 to-emerald-600" },
  { href: "/app/purchases", key: "purchases", icon: ShoppingBag, badgeColor: "from-sky-500 to-blue-600" },
  { href: "/app/service", key: "servicing", icon: Wrench, badgeColor: "from-amber-500 to-orange-600" },
  { href: "/app/customers", key: "customers", icon: Users, badgeColor: "from-indigo-500 to-blue-600" },
  { href: "/app/suppliers", key: "suppliers", icon: Truck, badgeColor: "from-emerald-500 to-teal-600" },
  { href: "/app/expenses", key: "expenses", icon: Receipt, badgeColor: "from-rose-500 to-pink-600" },
  { href: "/app/accounts", key: "accounts", icon: BookOpen, badgeColor: "from-emerald-600 to-green-600" },
  { href: "/app/dues", key: "dues", icon: AlertCircle, badgeColor: "from-red-500 to-rose-600" },
  { href: "/app/staff", key: "staff", icon: UserCheck, badgeColor: "from-cyan-500 to-blue-600" },
  { href: "/app/approvals", key: "approvals", icon: ShieldCheck, badgeColor: "from-violet-500 to-purple-600" },
  { href: "/app/statements", key: "statements", icon: FileText, badgeColor: "from-emerald-500 to-teal-600" },
  { href: "/app/operations", key: "operations", icon: SlidersHorizontal, badgeColor: "from-slate-600 to-zinc-700" },
  { href: "/app/reports", key: "reports", icon: BarChart3, badgeColor: "from-pink-500 to-rose-600" },
  { href: "/app/settings", key: "settings", icon: Settings, badgeColor: "from-zinc-500 to-slate-600" },
];

interface SidebarProps {
  locale?: Locale;
}

export function Sidebar({ locale = "bn" }: SidebarProps) {
  const pathname = usePathname();
  const dict = getDictionary(locale);
  const { navigatingTarget, startNavigation } = useNavigation();

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-border/80 bg-card/85 backdrop-blur-2xl h-screen sticky top-0 select-none shadow-sm z-30">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-border/70 relative">
        <div className="relative group shrink-0">
          <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 opacity-60 blur-xs group-hover:opacity-100 transition duration-300" />
          <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-white/40 dark:border-white/10 shadow-sm bg-background flex items-center justify-center">
            <Image
              src="/icons/icon-192.jpg"
              alt="Rashed Telecom"
              width={36}
              height={36}
              className="object-cover"
              priority
            />
          </div>
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm truncate tracking-tight text-foreground">
              {dict.shopName}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground truncate">
            {dict.tagline}
          </span>
        </div>
      </div>

      {/* Nav list with Custom Styled Scrollbar */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isCurrent =
            item.href === "/app"
              ? pathname === "/app" || pathname === "/"
              : pathname.startsWith(item.href);

          const isPending = navigatingTarget === item.href;
          const isActive = navigatingTarget ? isPending : isCurrent;
          const isLoading = isPending && !isCurrent;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={() => startNavigation(item.href)}
              className={cn(
                "relative group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-[0.98]",
                isActive
                  ? "bg-gradient-to-r from-primary to-indigo-600 text-white shadow-md shadow-primary/25 font-bold scale-[1.02] border border-white/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:translate-x-0.5"
              )}
            >
              {/* Active Left Indicator Bar */}
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-white shadow-sm" />
              )}

              {/* Icon Container with Gradient Hover Glow */}
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                  isActive
                    ? "bg-white/20 text-white shadow-inner"
                    : `bg-muted/60 text-foreground/80 group-hover:bg-gradient-to-tr ${item.badgeColor} group-hover:text-white group-hover:shadow-xs`
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>

              <span className="truncate">{dict.nav[item.key]}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info Capsule */}
      <div className="p-3 border-t border-border/70 bg-muted/20">
        <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-card/60 border border-border/50">
          <span className="text-muted-foreground font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" />
            {dict.common.timezone}
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {dict.common.online}
          </span>
        </div>
      </div>
    </aside>
  );
}
