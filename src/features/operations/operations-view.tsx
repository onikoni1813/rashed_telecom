"use client";

import React, { useState } from "react";
import { formatBDT, formatDhakaDate } from "@/lib/i18n";
import {
  SlidersHorizontal,
  History,
  Download,
  Upload,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileJson,
  User,
  Activity,
  Layers,
  Calendar,
  X,
  Eye,
} from "lucide-react";

export interface SerializedAuditLog {
  id: string;
  createdAt: string;
  actorName: string;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  reason: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  ipAddress: string | null;
}

interface OperationsViewProps {
  shopId: string;
  initialAuditLogs: SerializedAuditLog[];
  totalLogs: number;
}

export function OperationsView({
  shopId,
  initialAuditLogs,
  totalLogs,
}: OperationsViewProps) {
  const [activeTab, setActiveTab] = useState<"AUDIT" | "IMPORT_EXPORT">("AUDIT");

  // Audit Log State
  const [logs, setLogs] = useState<SerializedAuditLog[]>(initialAuditLogs);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("");
  const [isSearchingLogs, setIsSearchingLogs] = useState(false);
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<SerializedAuditLog | null>(null);

  // Import / Export State
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [importJsonText, setImportJsonText] = useState("");
  const [importStatus, setImportStatus] = useState<{
    success?: boolean;
    message?: string;
    imported?: number;
    updated?: number;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Handle Audit Log Search
  const handleSearchAudit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearchingLogs(true);
    try {
      const params = new URLSearchParams({
        shopId,
        ...(selectedEntity ? { entityType: selectedEntity } : {}),
      });

      const res = await fetch(`/api/v1/operations/audit-search?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.data?.logs) {
        setLogs(
          data.data.logs.map((l: any) => ({
            id: l.id,
            createdAt: l.createdAt,
            actorName: l.actor?.fullName || "System",
            actorEmail: l.actor?.email || null,
            action: l.action,
            entityType: l.entityType,
            entityId: l.entityId,
            reason: l.reason,
            beforeState: l.beforeState,
            afterState: l.afterState,
            ipAddress: l.ipAddress,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to search logs", err);
    } finally {
      setIsSearchingLogs(false);
    }
  };

  // Filter logs locally by search term
  const displayedLogs = logs.filter((l) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.action.toLowerCase().includes(term) ||
      l.entityType.toLowerCase().includes(term) ||
      l.actorName.toLowerCase().includes(term) ||
      (l.reason && l.reason.toLowerCase().includes(term))
    );
  });

  // Handle Product Export
  const handleExportProducts = async (format: "json" | "csv") => {
    setIsExporting("products");
    try {
      const res = await fetch(`/api/v1/operations/export/products?shopId=${shopId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to export");

      const products = data.data.products;
      let blob: Blob;
      let filename = `rashed-products-${new Date().toISOString().slice(0, 10)}`;

      if (format === "json") {
        blob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json" });
        filename += ".json";
      } else {
        const headers = ["id", "sku", "barcode", "name", "category", "brand", "costPrice", "sellingPrice", "quantityOnHand", "minStockAlert"];
        const csvRows = [
          headers.join(","),
          ...products.map((p: any) =>
            headers.map((h) => `"${String(p[h] ?? "").replace(/"/g, '""')}"`).join(",")
          ),
        ];
        blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
        filename += ".csv";
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("এক্সপোর্ট ব্যর্থ হয়েছে: " + err.message);
    } finally {
      setIsExporting(null);
    }
  };

  // Handle JSON Import
  const handleImportProducts = async () => {
    if (!importJsonText.trim()) return;
    setIsImporting(true);
    setImportStatus(null);

    try {
      let parsedRows: any[];
      try {
        parsedRows = JSON.parse(importJsonText);
        if (!Array.isArray(parsedRows)) {
          throw new Error("JSON ফরম্যাটটি অ্যারে (Array) হতে হবে: [ { ... }, { ... } ]");
        }
      } catch (pe: any) {
        throw new Error("ভুল JSON সিনট্যাক্স: " + pe.message);
      }

      const res = await fetch("/api/v1/operations/import/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          products: parsedRows,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to import products");
      }

      setImportStatus({
        success: true,
        message: "পণ্য তালিকা সফলভাবে ইম্পোর্ট ও আপডেট করা হয়েছে!",
        imported: data.data.importedCount,
        updated: data.data.updatedCount,
      });
      setImportJsonText("");
    } catch (err: any) {
      setImportStatus({
        success: false,
        message: err.message,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Elevated Command Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-r from-card/90 via-card/60 to-card/90 p-6 sm:p-7 backdrop-blur-xl shadow-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/25 ring-2 ring-white/10 shrink-0">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  সিস্টেম অপারেশনস ও অডিট ট্রেইল
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-500/10 border border-violet-500/30 text-violet-500 dark:text-violet-400">
                  <Activity className="w-3 h-3" />
                  Immutable Audit Log
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                প্রত্যেকটি লেনদেন ও পরিবর্তনের স্বচ্ছ অডিট ট্রেইল রেকর্ড এবং তথ্য ইম্পোর্ট/এক্সপোর্ট
              </p>
            </div>
          </div>

          {/* Floating Pill Tab Toggle */}
          <div className="glass-panel p-1.5 rounded-2xl border border-border/60 backdrop-blur-xl flex items-center gap-2 shadow-md">
            <button
              onClick={() => setActiveTab("AUDIT")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "AUDIT"
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <History className="w-4 h-4" />
              <span>অডিট ট্রেইল ({totalLogs})</span>
            </button>
            <button
              onClick={() => setActiveTab("IMPORT_EXPORT")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "IMPORT_EXPORT"
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>ডাটা ইম্পোর্ট ও এক্সপোর্ট</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === "AUDIT" && (
        <div className="space-y-4">
          {/* Audit Search Toolbar */}
          <div className="glass-panel p-3.5 rounded-2xl border border-border/60 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="অ্যাকশন, ব্যবহারকারী বা কারণ খুঁজুন..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-xs bg-card/80 border border-border/70 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-violet-500/30 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={selectedEntity}
                onChange={(e) => {
                  setSelectedEntity(e.target.value);
                }}
                className="text-xs bg-card/80 border border-border/70 rounded-xl p-2 font-semibold text-foreground focus:outline-hidden"
              >
                <option value="">সকল সত্ত্বা (All Entities)</option>
                <option value="StaffProfile">স্টাফ প্রোফাইল (StaffProfile)</option>
                <option value="AttendanceRecord">উপস্থিতি (AttendanceRecord)</option>
                <option value="PayrollPayment">বেতন প্রদান (PayrollPayment)</option>
                <option value="ApprovalRequest">অনুমোদন অনুরোধ (ApprovalRequest)</option>
                <option value="Sale">বিক্রয় (Sale)</option>
                <option value="Product">পণ্য (Product)</option>
                <option value="Expense">ব্যয় (Expense)</option>
              </select>

              <button
                onClick={() => handleSearchAudit()}
                disabled={isSearchingLogs}
                className="shimmer-button px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-xs shadow-md shadow-violet-500/20 hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSearchingLogs ? "খোঁজা হচ্ছে..." : "ফিল্টার প্রয়োগ"}
              </button>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="glass-panel rounded-2xl border border-border/60 overflow-hidden shadow-xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/70 backdrop-blur-md border-b border-border/60 uppercase font-semibold text-muted-foreground tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">তারিখ ও সময়</th>
                    <th className="px-4 py-3.5">ব্যবহারকারী (Actor)</th>
                    <th className="px-4 py-3.5">অ্যাকশন (Action)</th>
                    <th className="px-4 py-3.5">সত্ত্বা (Entity)</th>
                    <th className="px-4 py-3.5">কারণ / বিবরণ (Reason)</th>
                    <th className="px-4 py-3.5 text-right">বিস্তারিত</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {displayedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                        <History className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="font-bold text-base text-foreground">কোনো অডিট রেকর্ড পাওয়া যায়নি</p>
                      </td>
                    </tr>
                  ) : (
                    displayedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-violet-500/5 transition-colors group">
                        <td className="px-5 py-4 whitespace-nowrap text-muted-foreground font-medium">
                          {formatDhakaDate(log.createdAt)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="font-bold text-foreground">{log.actorName}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/30">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="font-semibold text-foreground">{log.entityType}</span>
                        </td>
                        <td className="px-4 py-4 max-w-sm">
                          <span className="text-foreground/90 line-clamp-2 text-xs">
                            {log.reason || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => setSelectedLogForDetails(log)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/70 hover:bg-muted font-bold text-xs text-foreground transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-violet-500" />
                            দেখুন
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "IMPORT_EXPORT" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Card */}
          <div className="glass-panel p-6 rounded-3xl border border-border/60 shadow-xl backdrop-blur-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none" />

            <div className="flex items-center gap-3 border-b border-border/60 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-sm">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  ডাটা এক্সপোর্ট (Export Data)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  সিস্টেমের পণ্য ও স্টক তথ্য সুরক্ষিতভাবে ডাউনলোড করুন
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 backdrop-blur-sm flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-foreground">পণ্য ও স্টক তালিকা</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    সকল সক্রিয় পণ্য, ক্যাটাগরি, ক্রয়-বিক্রয় মূল্য ও মজুদ
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportProducts("csv")}
                    disabled={isExporting !== null}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold border border-emerald-500/30 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    CSV
                  </button>
                  <button
                    onClick={() => handleExportProducts("json")}
                    disabled={isExporting !== null}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-xs font-bold border border-blue-500/30 transition-all cursor-pointer"
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    JSON
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Import Card */}
          <div className="glass-panel p-6 rounded-3xl border border-border/60 shadow-xl backdrop-blur-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-500/10 to-transparent rounded-bl-full pointer-events-none" />

            <div className="flex items-center gap-3 border-b border-border/60 pb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-500 shadow-sm">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  পণ্য ইম্পোর্ট (Import Products JSON)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  বাল্ক পণ্য তালিকা JSON ফরম্যাটে আপলোড বা পেস্ট করুন
                </p>
              </div>
            </div>

            {importStatus && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start gap-2 border font-medium ${
                  importStatus.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
                }`}
              >
                {importStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                )}
                <div>
                  <div className="font-bold">{importStatus.message}</div>
                  {importStatus.success && (
                    <div className="mt-1 text-[11px]">
                      নতুন যুক্ত: {importStatus.imported} টি • আপডেট হয়েছে: {importStatus.updated} টি
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  JSON ফরম্যাট পেস্ট করুন (Paste JSON):
                </label>
                <textarea
                  rows={6}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder={`[\n  {\n    "sku": "SAM-A15-BLU",\n    "name": "Samsung Galaxy A15 128GB",\n    "categoryName": "Smartphones",\n    "costPrice": 16500,\n    "sellingPrice": 18200,\n    "brand": "Samsung"\n  }\n]`}
                  className="w-full text-xs font-mono bg-card/80 border border-border/70 rounded-xl p-3 focus:outline-hidden focus:ring-2 focus:ring-violet-500/30 font-medium"
                />
              </div>

              <button
                onClick={handleImportProducts}
                disabled={isImporting || !importJsonText.trim()}
                className="shimmer-button w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-xs hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                {isImporting ? "ইম্পোর্ট হচ্ছে..." : "পণ্য তালিকা ইম্পোর্ট করুন"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Details Modal */}
      {selectedLogForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  অডিট লগের বিস্তারিত (Audit Log Inspector)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  আইডি: {selectedLogForDetails.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedLogForDetails(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">সময়:</span>
                <span className="font-semibold text-foreground">
                  {formatDhakaDate(selectedLogForDetails.createdAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ব্যবহারকারী:</span>
                <span className="font-semibold text-foreground">
                  {selectedLogForDetails.actorName} ({selectedLogForDetails.actorEmail || "No email"})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">অ্যাকশন:</span>
                <span className="font-mono text-primary font-bold">
                  {selectedLogForDetails.action}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">সত্ত্বা ও আইডি:</span>
                <span className="font-mono text-foreground">
                  {selectedLogForDetails.entityType} [{selectedLogForDetails.entityId}]
                </span>
              </div>
              {selectedLogForDetails.reason && (
                <div className="pt-2 border-t border-border">
                  <span className="text-muted-foreground block mb-1">কারণ:</span>
                  <div className="text-foreground">{selectedLogForDetails.reason}</div>
                </div>
              )}
            </div>

            {selectedLogForDetails.afterState && (
              <div>
                <span className="text-xs font-semibold text-foreground block mb-1">
                  পরিবর্তিত তথ্য (State After Change):
                </span>
                <pre className="text-[11px] bg-muted/60 p-3 rounded-lg border border-border whitespace-pre-wrap font-mono overflow-x-auto max-h-60">
                  {JSON.stringify(selectedLogForDetails.afterState, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-border">
              <button
                onClick={() => setSelectedLogForDetails(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                বন্ধ করুন (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
