"use client";

import React, { useState } from "react";
import { KeyRound, Lock, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export function ChangePinModal({ isOpen, onClose, userId }: ChangePinModalProps) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (currentPin.length < 4) {
      setError("বর্তমান ৪-সংখ্যার পিন প্রদান করুন।");
      return;
    }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setError("নতুন পিন কোড অবশ্যই ঠিক ৪ ডিজিটের সংখ্যা হতে হবে।");
      return;
    }
    if (newPin !== confirmPin) {
      setError("নতুন পিন এবং পুনরায় দেওয়া পিন দুটি মিলছে না।");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPin,
          newPin,
          confirmPin,
          userId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "পিন পরিবর্তন ব্যর্থ হয়েছে।");
      }

      setSuccess(data.message || "পিন কোড সফলভাবে পরিবর্তন করা হয়েছে!");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");

      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1800);
    } catch (err: any) {
      setError(err.message || "পিন পরিবর্তন ব্যর্থ হয়েছে।");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setError(null);
    setSuccess(null);
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 relative">
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">পিন কোড পরিবর্তন</h3>
            <p className="text-xs text-muted-foreground">টার্মিনাল লগইনের ৪ সংখ্যার গোপন পিন আপডেট করুন</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              বর্তমান পিন (Current PIN)
            </label>
            <div className="relative">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-foreground text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 block">
              প্রাথমিক অবস্থায় ডিফল্ট পিন ছিল: ১২৩৪ (1234)
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              নতুন পিন কোড (New 4-digit PIN)
            </label>
            <div className="relative">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-foreground text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
              <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              নতুন পিন নিশ্চিত করুন (Confirm PIN)
            </label>
            <div className="relative">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-foreground text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
              <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <span>পিন পরিবর্তন করুন</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

