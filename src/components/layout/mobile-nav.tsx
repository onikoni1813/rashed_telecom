"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ShoppingCart,
  Wrench,
  Package,
  LayoutGrid,
  Loader2,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Locale } from "@/types";
import { useNavigation } from "./navigation-context";

interface MobileNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const PRIMARY_MOBILE_ITEMS: MobileNavItem[] = [
  { href: "/app", label: "হোম", icon: Home },
  { href: "/app/pos", label: "POS", icon: ShoppingCart },
  { href: "/app/service", label: "সার্ভিসিং", icon: Wrench },
  { href: "/app/products", label: "পণ্য", icon: Package },
];

interface MobileNavProps {
  locale?: Locale;
  onOpenDrawer?: () => void;
  isDrawerOpen?: boolean;
}

export function MobileNav({
  locale = "bn",
  onOpenDrawer,
  isDrawerOpen = false,
}: MobileNavProps) {
  const pathname = usePathname();
  const { navigatingTarget, startNavigation } = useNavigation();

  // Determine if the active route is none of the primary 4 items
  const isPrimaryActive = PRIMARY_MOBILE_ITEMS.some((item) =>
    item.href === "/app"
      ? pathname === "/app" || pathname === "/"
      : pathname.startsWith(item.href)
  );

  const isMenuTabActive = isDrawerOpen || (!isPrimaryActive && !navigatingTarget);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-2xl border-t border-border/80 h-16 flex items-center justify-around px-2 shadow-2xl touch-manipulation">
      {PRIMARY_MOBILE_ITEMS.map((item) => {
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
              "relative flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-all select-none active:scale-90 touch-manipulation",
              isActive
                ? "text-primary font-black"
                : "text-muted-foreground hover:text-foreground"
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
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <Icon
                  className={cn(
                    "w-5 h-5",
                    isActive ? "stroke-[2.5px]" : "stroke-[1.75px]"
                  )}
                />
              )}
            </div>

            <span className="text-[11px] font-bold leading-tight truncate">
              {item.label}
            </span>
          </Link>
        );
      })}

      {/* 5th Tab: All Menus / Drawer Trigger */}
      <button
        type="button"
        onClick={onOpenDrawer}
        className={cn(
          "relative flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-all select-none active:scale-90 touch-manipulation",
          isMenuTabActive
            ? "text-primary font-black"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="Open All Modules Menu"
      >
        {/* Active Top Glow Pip */}
        {isMenuTabActive && (
          <span className="absolute -top-1 w-6 h-1 rounded-full bg-gradient-to-r from-primary to-indigo-600 shadow-sm shadow-primary/50 animate-pulse" />
        )}

        <div
          className={cn(
            "w-9 h-7 rounded-xl flex items-center justify-center transition-all",
            isMenuTabActive
              ? "bg-primary/10 text-primary scale-110 shadow-xs"
              : "hover:bg-muted/50"
          )}
        >
          <LayoutGrid
            className={cn(
              "w-5 h-5",
              isMenuTabActive ? "stroke-[2.5px]" : "stroke-[1.75px]"
            )}
          />
        </div>

        <span className="text-[11px] font-bold leading-tight truncate">
          সব মেনু
        </span>
      </button>
    </nav>
  );
}
