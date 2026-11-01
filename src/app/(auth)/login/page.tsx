"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Fingerprint,
  Lock,
  UserCheck,
  ShieldCheck,
  Delete,
  RotateCcw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  isBiometricsSupported,
  authenticateBiometric,
} from "@/lib/auth/webauthn-client";

interface StaffItem {
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  roleName: string;
  roleDescription: string | null;
  hasPin: boolean;
  hasBiometrics: boolean;
  biometricCount: number;
}

export default function LoginPage() {
  const router = useRouter();
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffItem | null>(null);
  const [pin, setPin] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [biometricLoading, setBiometricLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [biometricsAvailable, setBiometricsAvailable] = useState<boolean>(false);

  // Ref for submission handler to keep keyboard listener dependency-free
  const handlePinSubmitRef = React.useRef<(p?: string) => Promise<void>>(() => Promise.resolve());

  // Load staff members on mount
  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await fetch("/api/v1/auth/staff-list");
        const data = await res.json();
        if (data.success && data.staff.length > 0) {
          setStaffList(data.staff);
          // Default select first staff (Owner)
          setSelectedStaff(data.staff[0]);
        }
      } catch (err: any) {
        setErrorMessage("স্টাফ তালিকা লোড করা যায়নি।");
      }
    }

    async function checkBio() {
      const sup = await isBiometricsSupported();
      setBiometricsAvailable(sup);
    }

    loadStaff();
    checkBio();
  }, []);

  // Keyboard listener for PIN entry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading || biometricLoading) return;

      if (e.key >= "0" && e.key <= "9") {
        if (pin.length < 6) {
          setPin((prev) => prev + e.key);
          setErrorMessage(null);
        }
      } else if (e.key === "Backspace") {
        setPin((prev) => prev.slice(0, -1));
        setErrorMessage(null);
      } else if (e.key === "Escape") {
        setPin("");
        setErrorMessage(null);
      } else if (e.key === "Enter" && pin.length >= 4) {
        handlePinSubmitRef.current?.(pin);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, loading, biometricLoading]);

  // Handle PIN Submission
  const handlePinSubmit = async (pinToSubmit = pin) => {
    if (!selectedStaff) {
      setErrorMessage("দয়া করে একজন স্টাফ নির্বাচন করুন।");
      return;
    }

    if (pinToSubmit.length < 4) {
      setErrorMessage("পিন কোড সর্বনিম্ন ৪ ডিজিট হতে হবে।");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/v1/auth/login-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedStaff.userId,
          pin: pinToSubmit,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.error || "ভুল পিন কোড!");
        setPin("");
        setLoading(false);
        return;
      }

      setSuccessMessage("লগইন সফল হয়েছে! ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...");
      setTimeout(() => {
        router.push("/app");
        router.refresh();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || "লগইন ব্যর্থ হয়েছে।");
      setLoading(false);
    }
  };

  // Sync ref with current handlePinSubmit
  useEffect(() => {
    handlePinSubmitRef.current = handlePinSubmit;
  });

  // Handle Biometric / Fingerprint Login
  const handleBiometricLogin = async () => {
    if (selectedStaff && !selectedStaff.hasBiometrics) {
      setErrorMessage(
        "আপনার এই ডিভাইসে এখনও ফিঙ্গারপ্রিন্ট যুক্ত করা হয়নি। অনুগ্রহ করে প্রথমে ৪ ডিজিটের পিন কোড দিয়ে ড্যাশবোর্ডে প্রবেশ করুন, এরপর উপরে ডানপাশের প্রোফাইল আইকনে ক্লিক করে 'ফিঙ্গারপ্রিন্ট যোগ করুন' অপশন থেকে আঙুল স্ক্যান করে নিন।"
      );
      return;
    }

    setBiometricLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await authenticateBiometric(selectedStaff?.userId);
      if (result.success) {
        setSuccessMessage("ফিঙ্গারপ্রিন্ট যাচাইকরণ সফল! টার্মিনাল আনলক হচ্ছে...");
        setTimeout(() => {
          router.push("/app");
          router.refresh();
        }, 500);
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (
        msg.includes("timed out") ||
        msg.includes("not allowed") ||
        msg.includes("NotAllowedError") ||
        msg.includes("পাসকি পাওয়া যায়নি")
      ) {
        setErrorMessage(
          "ফিঙ্গারপ্রিন্ট স্ক্যান বাতিল হয়েছে অথবা এই ডিভাইসে কোনো পাসকি নেই। প্রথমে পিন কোড দিয়ে লগইন করে প্রোফাইল থেকে ফিঙ্গারপ্রিন্ট যোগ করে নিন।"
        );
      } else {
        setErrorMessage(msg || "ফিঙ্গারপ্রিন্ট স্ক্যান ব্যর্থ হয়েছে।");
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleKeypadPress = (val: string) => {
    if (loading || biometricLoading) return;
    if (val === "DEL") {
      setPin((prev) => prev.slice(0, -1));
    } else if (val === "CLR") {
      setPin("");
    } else {
      if (pin.length < 6) {
        const nextPin = pin + val;
        setPin(nextPin);
        setErrorMessage(null);
        if (nextPin.length === 4) {
          // Auto submit on 4th digit for fast counter UX
          handlePinSubmit(nextPin);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 text-white select-none">
      <div className="w-full max-w-md bg-card/10 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand & Terminal Header */}
        <div className="text-center relative z-10 mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30 mb-3 border border-white/20">
            <Image
              src="/icons/icon-192.jpg"
              alt="Rashed Telecom"
              width={48}
              height={48}
              className="rounded-xl object-cover"
              priority
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>রাশেদ টেলিকম</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 font-semibold">
              কাউন্টার পিওএস
            </span>
          </h1>
          <p className="text-xs text-slate-300 mt-1 font-medium">
            নিরাপদ লোকাল সেশন ও ফিঙ্গারপ্রিন্ট আনলক টার্মিনাল
          </p>
        </div>

        {/* Staff Switcher */}
        <div className="mb-5 relative z-10">
          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 block">
            কর্মী নির্বাচন করুন (Select Staff)
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {staffList.map((staff) => {
              const isSelected = selectedStaff?.userId === staff.userId;
              return (
                <button
                  key={staff.userId}
                  type="button"
                  onClick={() => {
                    setSelectedStaff(staff);
                    setPin("");
                    setErrorMessage(null);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? "bg-blue-600/30 border-blue-400 text-white shadow-md shadow-blue-600/20 ring-2 ring-blue-400/50"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs truncate">{staff.name}</span>
                    {isSelected && (
                      <UserCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[10px]">
                    <span className="text-slate-400">{staff.roleName}</span>
                    {staff.hasBiometrics && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                        <Fingerprint className="w-2.5 h-2.5" />
                        বায়ো
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Biometric One-Touch Button */}
        {biometricsAvailable && (
          <div className="mb-6 relative z-10">
            <button
              type="button"
              disabled={biometricLoading || loading}
              onClick={handleBiometricLogin}
              className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm shadow-lg border flex items-center justify-center gap-2.5 transition-all transform active:scale-98 disabled:opacity-50 ${
                selectedStaff?.hasBiometrics
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25 border-emerald-400/30"
                  : "bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-slate-200 border-white/10 shadow-slate-900/40"
              }`}
            >
              <Fingerprint
                className={`w-5 h-5 ${
                  biometricLoading
                    ? "animate-pulse"
                    : selectedStaff?.hasBiometrics
                      ? "text-emerald-300"
                      : "text-amber-400"
                }`}
              />
              <span>
                {biometricLoading
                  ? "ফিঙ্গারপ্রিন্ট স্ক্যান করা হচ্ছে..."
                  : selectedStaff?.hasBiometrics
                    ? "ফিঙ্গারপ্রিন্ট স্পর্শ করে প্রবেশ করুন"
                    : "ফিঙ্গারপ্রিন্ট সেট করতে প্রথমে পিন দিয়ে ঢুকুন"}
              </span>
            </button>
          </div>
        )}

        {/* PIN Entry Area */}
        <div className="relative z-10 bg-black/30 border border-white/10 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span>পিন কোড প্রবেশ করান</span>
            </div>
          </div>

          {/* Masked PIN Display */}
          <div className="flex justify-center items-center gap-3 py-2">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    isFilled
                      ? "bg-blue-400 scale-125 shadow-md shadow-blue-400/50"
                      : "bg-white/20 border border-white/30"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Numeric Keypad for Counter Touchscreen / Mouse */}
        <div className="grid grid-cols-3 gap-2 relative z-10">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLR", "0", "DEL"].map((k) => (
            <button
              key={k}
              type="button"
              disabled={loading || biometricLoading}
              onClick={() => handleKeypadPress(k)}
              className={`h-12 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center ${
                k === "CLR"
                  ? "bg-white/5 hover:bg-white/10 text-slate-400 text-xs"
                  : k === "DEL"
                    ? "bg-white/5 hover:bg-white/10 text-rose-400"
                    : "bg-white/10 hover:bg-white/20 text-white text-base shadow-xs"
              }`}
            >
              {k === "DEL" ? (
                <Delete className="w-4 h-4" />
              ) : k === "CLR" ? (
                <RotateCcw className="w-3.5 h-3.5" />
              ) : (
                k
              )}
            </button>
          ))}
        </div>

        {/* Direct Submit Button if 4 digits entered */}
        <button
          type="button"
          disabled={loading || biometricLoading || pin.length < 4}
          onClick={() => handlePinSubmit()}
          className="mt-4 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>লগইন যাচাই হচ্ছে...</span>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>টার্মিনালে প্রবেশ করুন (Enter Terminal)</span>
            </>
          )}
        </button>

        {/* Footer info */}
        <div className="mt-5 text-center text-[10px] text-slate-400">
          কাউন্টার অটো-লক এবং নিরাপত্তা নীতি অনুযায়ী সক্রিয়
        </div>
      </div>
    </div>
  );
}
