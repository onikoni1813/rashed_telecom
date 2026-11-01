import React from "react";
import Image from "next/image";

export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white select-none">
      <div className="relative flex flex-col items-center">
        {/* Animated ambient glow */}
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 opacity-40 blur-xl animate-pulse" />

        {/* Logo Card */}
        <div className="relative w-20 h-20 rounded-2xl bg-slate-900 border border-white/20 shadow-2xl flex items-center justify-center mb-5 overflow-hidden">
          <Image
            src="/icons/icon-192.png"
            alt="Rashed Telecom"
            width={64}
            height={64}
            className="rounded-xl object-cover"
            priority
          />
        </div>

        {/* Spinner & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
          <span className="text-sm font-bold tracking-wide text-slate-200">
            টার্মিনাল প্রস্তুত হচ্ছে...
          </span>
        </div>
      </div>
    </div>
  );
}

