"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Globe, User, Clock, Sparkles } from "lucide-react";
import { Locale } from "@/types";
import { getDictionary, formatDhakaDate } from "@/lib/i18n";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";

interface TopbarProps {
  locale: Locale;
  onLocaleChange: (newLocale: Locale) => void;
}

export function Topbar({ locale, onLocaleChange }: TopbarProps) {
  const dict = getDictionary(locale);
  const [currentDateStr, setCurrentDateStr] = React.useState<string>("");

  React.useEffect(() => {
    setCurrentDateStr(formatDhakaDate(new Date(), locale, false));
    const timer = setInterval(() => {
      setCurrentDateStr(formatDhakaDate(new Date(), locale, false));
    }, 60000);
    return () => clearInterval(timer);
  }, [locale]);

  return (
    <header className="h-16 border-b border-border/80 bg-card/80 backdrop-blur-2xl sticky top-0 z-20 flex items-center justify-between px-4 lg:px-8 shadow-xs">
      {/* Left side: Mobile Brand Context & Clock */}
      <div className="flex items-center gap-3.5">
        <Link href="/app" className="lg:hidden flex items-center gap-2.5 group">
          <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-border shadow-xs bg-muted flex items-center justify-center group-hover:scale-105 transition-transform">
            <Image
              src="/icons/icon-192.jpg"
              alt="Rashed Telecom"
              width={32}
              height={32}
              className="object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm text-foreground tracking-tight leading-tight">
              {dict.shopName}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              সেন্ট্রাল কমান্ড
            </span>
          </div>
        </Link>

        {/* Dhaka Clock Capsule */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-xl border border-border/70 shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono text-foreground">{currentDateStr || "Asia/Dhaka"}</span>
        </div>
      </div>

      {/* Right side: Sync Status, Language selector & User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Offline & Sync Status Indicator Capsule */}
        <OfflineIndicator />

        {/* Language switcher button */}
        <button
          type="button"
          onClick={() => onLocaleChange(locale === "bn" ? "en" : "bn")}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-border/80 bg-background/80 hover:bg-muted/70 transition-all text-foreground shadow-2xs active:scale-95"
          title="Switch Language"
        >
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span>{locale === "bn" ? "English" : "বাংলা"}</span>
        </button>

        {/* User Profile Capsule */}
        <Link
          href="/app/settings"
          className="flex items-center gap-2.5 pl-2 border-l border-border/80 group hover:opacity-90 transition-opacity"
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
              RA
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-extrabold text-foreground leading-tight">
              Rashed Ahmed
            </span>
            <span className="text-[10px] font-medium text-primary leading-tight">
              মালিক (Owner)
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
