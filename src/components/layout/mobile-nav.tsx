"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ShoppingCart,
  Wrench,
  Warehouse,
  Menu,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Locale } from "@/types";
import { getDictionary } from "@/lib/i18n";

interface MobileNavItem {
  href: string;
  labelKey: "home" | "pos" | "servicing" | "inventory" | "more";
  icon: LucideIcon;
}

const MOBILE_ITEMS: MobileNavItem[] = [
  { href: "/app", labelKey: "home", icon: Home },
  { href: "/app/pos", labelKey: "pos", icon: ShoppingCart },
  { href: "/app/service", labelKey: "servicing", icon: Wrench },
  { href: "/app/inventory", labelKey: "inventory", icon: Warehouse },
  { href: "/app/settings", labelKey: "more", icon: Menu },
];

interface MobileNavProps {
  locale?: Locale;
}

export function MobileNav({ locale = "bn" }: MobileNavProps) {
  const pathname = usePathname();
  const dict = getDictionary(locale);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t h-16 flex items-center justify-around px-2 shadow-lg safe-area-bottom">
      {MOBILE_ITEMS.map((item) => {
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
              "flex flex-col items-center justify-center flex-1 py-1.5 gap-1 transition-colors select-none",
              isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-[1.75px]")} />
            <span className="text-[10px] leading-none truncate max-w-[64px]">
              {dict.nav[item.labelKey]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
