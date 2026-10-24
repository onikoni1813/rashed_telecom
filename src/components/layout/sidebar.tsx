"use client";

import React from "react";
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
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Locale } from "@/types";
import { getDictionary } from "@/lib/i18n";

interface NavItemConfig {
  href: string;
  key: keyof ReturnType<typeof getDictionary>["nav"];
  icon: LucideIcon;
}

const NAV_ITEMS: NavItemConfig[] = [
  { href: "/app", key: "dashboard", icon: LayoutDashboard },
  { href: "/app/pos", key: "pos", icon: ShoppingCart },
  { href: "/app/products", key: "products", icon: Package },
  { href: "/app/inventory", key: "inventory", icon: Warehouse },
  { href: "/app/purchases", key: "purchases", icon: ShoppingBag },
  { href: "/app/service", key: "servicing", icon: Wrench },
  { href: "/app/customers", key: "customers", icon: Users },
  { href: "/app/suppliers", key: "suppliers", icon: Truck },
  { href: "/app/accounts", key: "accounts", icon: BookOpen },
  { href: "/app/dues", key: "dues", icon: AlertCircle },
  { href: "/app/reports", key: "reports", icon: BarChart3 },
  { href: "/app/settings", key: "settings", icon: Settings },
];

interface SidebarProps {
  locale?: Locale;
}

export function Sidebar({ locale = "bn" }: SidebarProps) {
  const pathname = usePathname();
  const dict = getDictionary(locale);

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-card h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 h-16 border-b">
        <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-border shadow-xs bg-muted flex items-center justify-center">
          <Image
            src="/icons/icon-192.jpg"
            alt="Rashed Telecom"
            width={36}
            height={36}
            className="object-cover"
            priority
          />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-sm truncate tracking-tight text-foreground">
            {dict.shopName}
          </span>
          <span className="text-[11px] text-muted-foreground truncate">
            {dict.tagline}
          </span>
        </div>
      </div>

      {/* Nav list */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/app"
              ? pathname === "/app" || pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
              <span className="truncate">{dict.nav[item.key]}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t bg-muted/30">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-2 py-1">
          <span>{dict.common.timezone}</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {dict.common.online}
          </span>
        </div>
      </div>
    </aside>
  );
}
