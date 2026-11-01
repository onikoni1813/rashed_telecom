"use client";

import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import { MobileDrawer } from "./mobile-drawer";
import { NavigationProgress } from "./navigation-progress";
import { Locale } from "@/types";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [locale, setLocale] = useState<Locale>("bn");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background text-foreground print:bg-white print:text-black print:min-h-0 print:block">
      <NavigationProgress />

      {/* Desktop Sidebar */}
      <div className="print:hidden">
        <Sidebar locale={locale} />
      </div>

      {/* Mobile Drawer (17 Modules with instant search, accessed from top hamburger or bottom menu tab) */}
      <div className="print:hidden">
        <MobileDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          locale={locale}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-28 lg:pb-0 print:pb-0 print:block">
        <div className="print:hidden">
          <Topbar
            locale={locale}
            onLocaleChange={setLocale}
            onOpenDrawer={() => setIsDrawerOpen(true)}
          />
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto print:p-0 print:m-0 print:max-w-none print:w-full">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="print:hidden">
        <MobileNav
          locale={locale}
          onOpenDrawer={() => setIsDrawerOpen(true)}
          isDrawerOpen={isDrawerOpen}
        />
      </div>
    </div>
  );
}
