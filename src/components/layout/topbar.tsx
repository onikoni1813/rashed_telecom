"use client";

import React from "react";
import Image from "next/image";
import { Globe, User, Clock } from "lucide-react";
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
    <header className="h-16 border-b bg-card/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6">
      {/* Left side: Mobile Brand / Context */}
      <div className="flex items-center gap-3">
        <div className="lg:hidden flex items-center gap-2">
          <Image
            src="/icons/icon-192.jpg"
            alt="Rashed Telecom"
            width={28}
            height={28}
            className="rounded-md object-cover border"
          />
          <span className="font-bold text-sm text-foreground">
            {dict.shopName}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span>{currentDateStr || "Asia/Dhaka"}</span>
        </div>
      </div>

      {/* Right side: Sync Status, Language selector & User pill */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Offline & Sync Status Indicator */}
        <OfflineIndicator />

        {/* Language switcher button */}
        <button
          type="button"
          onClick={() => onLocaleChange(locale === "bn" ? "en" : "bn")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border bg-background hover:bg-muted transition-colors text-foreground"
          title="Switch Language"
        >
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span>{locale === "bn" ? "EN" : "বাং"}</span>
        </button>

        {/* User / Session Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l">
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-foreground leading-tight">
              Admin
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              Rashed Telecom
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
