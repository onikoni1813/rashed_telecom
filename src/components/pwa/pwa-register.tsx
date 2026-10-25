"use client";

import React, { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker in production & modern browsers
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[PWA] Service Worker registered with scope:", reg.scope);
          })
          .catch((err) => {
            console.warn("[PWA] Service Worker registration failed:", err);
          });
      });
    }

    // 2. Capture beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // 3. Detect if already installed (standalone mode)
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
    }
    setInstallPrompt(null);
  };

  if (!isInstallable || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm w-full bg-card/95 backdrop-blur-md border border-primary/30 p-4 rounded-xl shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-xs text-foreground">অ্যাপ ইনস্টল করুন</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            মোবাইল বা পিসিতে অফলাইন দ্রুত ব্যবহারের জন্য ইনস্টল করুন
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity shadow-xs flex items-center gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          ইনস্টল
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
