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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <SlidersHorizontal className="w-7 h-7 text-primary" />
            সিস্টেম অপারেশনস ও অডিট ট্রেইল (Operations & Audit Trail)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            প্রত্যেকটি লেনদেন ও পরিবর্তনের স্বচ্ছ অডিট রেকর্ড এবং তথ্য ইম্পোর্ট/এক্সপোর্ট
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab("AUDIT")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "AUDIT"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="w-4 h-4" />
            অডিট ট্রেইল (Audit Logs)
          </button>
          <button
            onClick={() => setActiveTab("IMPORT_EXPORT")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "IMPORT_EXPORT"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="w-4 h-4" />
            ডাটা ইম্পোর্ট ও এক্সপোর্ট (Data Management)
          </button>
        </div>
      </div>

      {activeTab === "AUDIT" && (
        <div className="space-y-4">
          {/* Audit Search Toolbar */}
          <div className="bg-card p-4 rounded-xl border border-border flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="অ্যাকশন, ব্যবহারকারী বা কারণ খুঁজুন..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={selectedEntity}
                onChange={(e) => {
                  setSelectedEntity(e.target.value);
                }}
                className="text-xs bg-muted/40 border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSearchingLogs ? "খোঁজা হচ্ছে..." : "ফিল্টার প্রয়োগ"}
              </button>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border uppercase font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">তারিখ ও সময়</th>
                    <th className="px-4 py-3">ব্যবহারকারী (Actor)</th>
                    <th className="px-4 py-3">অ্যাকশন (Action)</th>
                    <th className="px-4 py-3">সত্ত্বা (Entity)</th>
                    <th className="px-4 py-3">কারণ / বিবরণ (Reason)</th>
                    <th className="px-4 py-3 text-right">বিস্তারিত</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        কোনো অডিট রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    displayedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {formatDhakaDate(log.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-foreground">{log.actorName}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-medium text-foreground">{log.entityType}</span>
                        </td>
                        <td className="px-4 py-3 max-w-sm">
                          <span className="text-foreground/90 line-clamp-2">
                            {log.reason || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <button
                            onClick={() => setSelectedLogForDetails(log)}
                            className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium"
                          >
                            <Eye className="w-3.5 h-3.5" />
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
          <div className="bg-card p-6 rounded-xl border border-border shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  ডাটা এক্সপোর্ট (Export Data)
                </h3>
                <p className="text-xs text-muted-foreground">
                  সিস্টেমের পণ্য ও স্টক তথ্য ডাউনলোড করুন
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-foreground">পণ্য ও স্টক তালিকা</div>
                  <div className="text-xs text-muted-foreground">
                    সকল সক্রিয় পণ্য, ক্যাটাগরি, মূল্য ও বর্তমান মজুত
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportProducts("csv")}
                    disabled={isExporting !== null}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold border border-emerald-500/30 transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    CSV
                  </button>
                  <button
                    onClick={() => handleExportProducts("json")}
                    disabled={isExporting !== null}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-xs font-semibold border border-blue-500/30 transition-colors"
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    JSON
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Import Card */}
          <div className="bg-card p-6 rounded-xl border border-border shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  পণ্য ইম্পোর্ট (Import Products JSON)
                </h3>
                <p className="text-xs text-muted-foreground">
                  বাল্ক পণ্য তালিকা JSON ফরম্যাটে আপলোড বা পেস্ট করুন
                </p>
              </div>
            </div>

            {importStatus && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
                  importStatus.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
                }`}
              >
                {importStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold">{importStatus.message}</div>
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
                <label className="block text-xs font-semibold text-foreground mb-1">
                  JSON ফরম্যাট পেস্ট করুন (Paste JSON):
                </label>
                <textarea
                  rows={6}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder={`[\n  {\n    "sku": "SAM-A15-BLU",\n    "name": "Samsung Galaxy A15 128GB",\n    "categoryName": "Smartphones",\n    "costPrice": 16500,\n    "sellingPrice": 18200,\n    "brand": "Samsung"\n  }\n]`}
                  className="w-full text-xs font-mono bg-muted/40 border border-border rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <button
                onClick={handleImportProducts}
                disabled={isImporting || !importJsonText.trim()}
                className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
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
