"use client";

import React, { useState, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Layers,
  Trash2,
  X,
  ArrowRight,
  Database,
} from "lucide-react";
import {
  getPendingOutboxItems,
  getConflictOutboxItems,
  processSyncOutbox,
  resolveConflict,
  clearSyncedItems,
} from "@/lib/offline/sync-engine";
import { getOfflineDatabase } from "@/lib/offline/db";
import { SyncOutboxItem } from "@/lib/offline/types";
import { formatDhakaDate } from "@/lib/i18n";

interface OfflineIndicatorProps {
  shopId?: string;
}

export function OfflineIndicator({ shopId = "11111111-1111-1111-1111-111111111111" }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [conflictCount, setConflictCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [outboxItems, setOutboxItems] = useState<SyncOutboxItem[]>([]);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleTriggerSyncRef = React.useRef<() => void>(() => {});

  // Monitor network status
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        handleTriggerSyncRef.current();
      };

      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Poll IndexedDB outbox queue
  const refreshOutboxStatus = async () => {
    if (typeof window === "undefined") return;
    try {
      const db = getOfflineDatabase();
      const all = await db.syncOutbox.toArray();
      setOutboxItems(all.reverse());

      const pending = all.filter(
        (i) => i.status === "PENDING" || (i.status === "FAILED" && i.retryCount < i.maxRetries)
      );
      const conflicts = all.filter((i) => i.status === "CONFLICT");

      setPendingCount(pending.length);
      setConflictCount(conflicts.length);
    } catch (e) {
      // IndexedDB might not be available in private mode or SSR
    }
  };

  useEffect(() => {
    refreshOutboxStatus();
    const interval = setInterval(refreshOutboxStatus, 5000);
    return () => clearInterval(interval);
  }, [shopId]);

  const handleTriggerSync = async () => {
    if (!isOnline) {
      setSyncMessage("ইন্টারনেট সংযোগ না থাকায় এখন সিঙ্ক করা সম্ভব নয়।");
      return;
    }
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const result = await processSyncOutbox(shopId);
      await refreshOutboxStatus();
      setSyncMessage(`সিঙ্ক সম্পন্ন: ${result.syncedCount} টি সফল, ${result.conflictCount} টি কনফ্লিক্ট`);
    } catch (err: any) {
      setSyncMessage("সিঙ্ক ব্যর্থ হয়েছে: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };
  handleTriggerSyncRef.current = handleTriggerSync;

  const handleResolve = async (outboxId: string, resolution: "DISCARD" | "RETRY") => {
    await resolveConflict(outboxId, resolution);
    await refreshOutboxStatus();
  };

  const handleClearSynced = async () => {
    await clearSyncedItems(shopId);
    await refreshOutboxStatus();
  };

  return (
    <>
      {/* Top Navbar Status Badge */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            refreshOutboxStatus();
            setIsModalOpen(true);
          }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            !isOnline
              ? "bg-amber-500/10 text-amber-500 border-amber-500/30 animate-pulse"
              : conflictCount > 0
              ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
              : pendingCount > 0
              ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          }`}
          title="সিঙ্ক ও আউটবক্স স্ট্যাটাস দেখুন"
        >
          {!isOnline ? (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>অফলাইন</span>
              {pendingCount > 0 && <span className="font-bold">({pendingCount})</span>}
            </>
          ) : conflictCount > 0 ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>কনফ্লিক্ট ({conflictCount})</span>
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>সিঙ্ক হচ্ছে...</span>
            </>
          ) : pendingCount > 0 ? (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>সিঙ্ক অপেক্ষমাণ ({pendingCount})</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span>অনলাইন</span>
            </>
          )}
        </button>
      </div>

      {/* Sync Outbox & Conflict Resolution Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  অফলাইন ড্রাফট ও সিঙ্ক আউটবক্স (Sync Outbox)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  নেটওয়ার্ক বিচ্ছিন্ন অবস্থায় সংরক্ষিত তথ্য ও সার্ভার সিঙ্ক্রোনাইজেশন
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Connection Banner */}
            <div
              className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
                isOnline
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-500"
              }`}
            >
              <div className="flex items-center gap-2">
                {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                <span className="font-semibold">
                  {isOnline
                    ? "ইন্টারনেট সংযোগ চালু রয়েছে (Online)"
                    : "ইন্টারনেট সংযোগ বিচ্ছিন্ন (Offline) — ড্রাফট মোড সক্রিয়"}
                </span>
              </div>
              <button
                onClick={handleTriggerSync}
                disabled={isSyncing || !isOnline}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "সিঙ্ক হচ্ছে..." : "এখনই সিঙ্ক করুন"}
              </button>
            </div>

            {syncMessage && (
              <div className="p-2.5 rounded bg-muted/40 border border-border text-xs text-foreground font-medium">
                {syncMessage}
              </div>
            )}

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {outboxItems.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto" />
                  <div>আউটবক্সে কোনো অপেক্ষমাণ বা পেন্ডিং ডাটা নেই।</div>
                  <div className="text-[11px]">সকল ট্রানজেকশন সার্ভারের সাথে সম্পূর্ণ সিঙ্ক করা রয়েছে।</div>
                </div>
              ) : (
                outboxItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                      item.status === "CONFLICT"
                        ? "bg-rose-500/5 border-rose-500/30"
                        : item.status === "FAILED"
                        ? "bg-amber-500/5 border-amber-500/30"
                        : item.status === "SYNCED"
                        ? "bg-emerald-500/5 border-emerald-500/20 opacity-75"
                        : "bg-muted/30 border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground">
                          {item.entityType}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            item.status === "SYNCED"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : item.status === "CONFLICT"
                              ? "bg-rose-500/10 text-rose-500"
                              : item.status === "SYNCING"
                              ? "bg-blue-500/10 text-blue-500 animate-pulse"
                              : "bg-amber-500/10 text-amber-500"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-[11px]">
                        {formatDhakaDate(item.createdAt)}
                      </span>
                    </div>

                    {/* Summary Payload */}
                    <div className="bg-background/80 p-2 rounded border border-border text-[11px] font-mono text-foreground/80 truncate">
                      {JSON.stringify(item.payload)}
                    </div>

                    {/* Error / Conflict Notes */}
                    {item.errorSummary && (
                      <div className="text-rose-500 text-[11px] font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>ত্রুটি / কনফ্লিক্ট: {item.errorSummary}</span>
                      </div>
                    )}

                    {/* Conflict Actions */}
                    {item.status === "CONFLICT" && (
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-500/20">
                        <button
                          onClick={() => handleResolve(item.id, "DISCARD")}
                          className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 font-semibold text-[11px] transition-colors"
                        >
                          ড্রাফট বাতিল (Discard)
                        </button>
                        <button
                          onClick={() => handleResolve(item.id, "RETRY")}
                          className="px-2.5 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 font-semibold text-[11px] transition-opacity"
                        >
                          পুনরায় চেষ্টা (Retry Post)
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border pt-3 flex items-center justify-between text-xs">
              <button
                onClick={handleClearSynced}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-[11px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                সম্পন্ন তালিকা পরিষ্কার করুন (Clear Synced)
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-muted text-foreground hover:bg-muted/80 text-xs font-semibold"
              >
                বন্ধ করুন (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
