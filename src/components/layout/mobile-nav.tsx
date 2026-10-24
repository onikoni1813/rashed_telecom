"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ShoppingCart,
  Wrench,
  Package,
  Settings,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Locale } from "@/types";
import { getDictionary } from "@/lib/i18n";

interface MobileNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const MOBILE_ITEMS: MobileNavItem[] = [
  { href: "/app", label: "হোম", icon: Home },
  { href: "/app/pos", label: "POS", icon: ShoppingCart },
  { href: "/app/service", label: "সার্ভিসিং", icon: Wrench },
  { href: "/app/products", label: "পণ্য", icon: Package },
  { href: "/app/settings", label: "সেটিংস", icon: Settings },
];

interface MobileNavProps {
  locale?: Locale;
}

export function MobileNav({ locale = "bn" }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-2xl border-t border-border/80 h-16 flex items-center justify-around px-2 shadow-2xl">
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
              "relative flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-all select-none active:scale-90",
              isActive ? "text-primary font-black" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {/* Active Top Glow Pip */}
            {isActive && (
              <span className="absolute -top-1 w-6 h-1 rounded-full bg-gradient-to-r from-primary to-indigo-600 shadow-sm shadow-primary/50 animate-pulse" />
            )}

            <div
              className={cn(
                "w-9 h-7 rounded-xl flex items-center justify-center transition-all",
                isActive
                  ? "bg-primary/10 text-primary scale-110 shadow-xs"
                  : "hover:bg-muted/50"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-[1.75px]")} />
            </div>

            <span className="text-[11px] font-bold leading-tight truncate">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
