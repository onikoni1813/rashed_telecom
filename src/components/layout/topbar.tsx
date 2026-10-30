"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Globe,
  User,
  Clock,
  Sparkles,
  Fingerprint,
  LogOut,
  Settings,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { Locale } from "@/types";
import { getDictionary, formatDhakaDate } from "@/lib/i18n";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import {
  registerBiometricDevice,
  isBiometricsSupported,
} from "@/lib/auth/webauthn-client";

interface TopbarProps {
  locale: Locale;
  onLocaleChange: (newLocale: Locale) => void;
}

interface UserProfile {
  id: string;
  name: string;
  email: string | null;
  role: string;
}

export function Topbar({ locale, onLocaleChange }: TopbarProps) {
  const dict = getDictionary(locale);
  const router = useRouter();
  const [currentDateStr, setCurrentDateStr] = useState<string>("");
  const [user, setUser] = useState<UserProfile>({
    id: "00000000-0000-0000-0000-000000000001",
    name: "Rashed Ahmed",
    email: "admin@rashedtelecom.local",
    role: "মালিক (Owner)",
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [bioModalOpen, setBioModalOpen] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioMessage, setBioMessage] = useState<string | null>(null);
  const [bioError, setBioError] = useState<string | null>(null);
  const [bioAvailable, setBioAvailable] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentDateStr(formatDhakaDate(new Date(), locale, false));
    const timer = setInterval(() => {
      setCurrentDateStr(formatDhakaDate(new Date(), locale, false));
    }, 60000);
    return () => clearInterval(timer);
  }, [locale]);

  // Load active session user
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/v1/auth/me");
        const json = await res.json();
        if (json.data && json.data.user) {
          const u = json.data.user;
          const membership = json.data.memberships?.[0];
          setUser({
            id: u.id,
            name: u.fullName || u.email || "দোকান কর্মী",
            email: u.email,
            role: membership?.role || "Staff",
          });
        }
      } catch {
        // Fallback default
      }
    }

    async function checkBio() {
      const sup = await isBiometricsSupported();
      setBioAvailable(sup);
    }

    loadUser();
    checkBio();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  const handleRegisterBiometric = async () => {
    setBioLoading(true);
    setBioError(null);
    setBioMessage(null);

    try {
      const res = await registerBiometricDevice();
      setBioMessage(res.message || "ফিঙ্গারপ্রিন্ট সফলভাবে নিবন্ধিত হয়েছে!");
      setTimeout(() => {
        setBioModalOpen(false);
        setBioMessage(null);
      }, 1800);
    } catch (err: any) {
      setBioError(err.message || "নিবন্ধন ব্যর্থ হয়েছে।");
    } finally {
      setBioLoading(false);
    }
  };

  return (
    <>
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
            <span className="font-mono text-foreground">
              {currentDateStr || "Asia/Dhaka"}
            </span>
          </div>
        </div>

        {/* Right side: Sync Status, Language switcher & User Profile */}
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

          {/* User Profile Capsule with Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center gap-2.5 pl-2 border-l border-border/80 group hover:opacity-90 transition-opacity"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-extrabold text-foreground leading-tight">
                  {user.name}
                </span>
                <span className="text-[10px] font-medium text-primary leading-tight">
                  {user.role}
                </span>
              </div>
            </button>

            {/* Quick Profile & Terminal Menu */}
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="p-3 border-b border-border/60 mb-1">
                  <div className="font-bold text-xs text-foreground">{user.name}</div>
                  <div className="text-[11px] text-muted-foreground">{user.email}</div>
                  <div className="inline-flex mt-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    {user.role}
                  </div>
                </div>

                <div className="space-y-1">
                  {/* Register Biometric */}
                  {bioAvailable && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setBioModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl hover:bg-muted text-foreground transition-colors"
                    >
                      <Fingerprint className="w-4 h-4 text-emerald-500" />
                      <span>ফিঙ্গারপ্রিন্ট যোগ করুন</span>
                    </button>
                  )}

                  {/* Settings Link */}
                  <Link
                    href="/app/settings"
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl hover:bg-muted text-foreground transition-colors"
                  >
                    <Settings className="w-4 h-4 text-primary" />
                    <span>শপ সেটিংস</span>
                  </Link>

                  {/* Lock / Logout */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl hover:bg-rose-500/10 text-rose-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>টার্মিনাল লক / লগআউট</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Biometric Registration Modal */}
      {bioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card border border-border rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setBioModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center mb-3">
                <Fingerprint className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base text-foreground">
                ফিঙ্গারপ্রিন্ট নিবন্ধন
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                এই ডিভাইসে (ল্যাপটপ/মোবাইল/পিসি) দ্রুত এক-স্পর্শে লগইন করার জন্য আঙুলের ছাপ যুক্ত করুন
              </p>
            </div>

            {bioError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bioError}</span>
              </div>
            )}

            {bioMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{bioMessage}</span>
              </div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                disabled={bioLoading}
                onClick={handleRegisterBiometric}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Fingerprint className={`w-4 h-4 ${bioLoading ? "animate-pulse" : ""}`} />
                <span>
                  {bioLoading ? "সেন্সর স্পর্শ করুন..." : "সেন্সরে আঙুল রাখুন ও নিবন্ধন করুন"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBioModalOpen(false)}
                className="w-full py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                বাতিল করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
