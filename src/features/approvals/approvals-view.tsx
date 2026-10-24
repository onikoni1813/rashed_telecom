"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDhakaDate, formatBDT } from "@/lib/i18n";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Check,
  X,
  FileText,
  User,
  ArrowRight,
} from "lucide-react";

export interface SerializedApprovalRequest {
  id: string;
  requestType: string;
  referenceId: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedById: string;
  requestedByName: string;
  requestedByEmail: string | null;
  createdAt: string;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
  details: Record<string, unknown> | null;
}

interface ApprovalsViewProps {
  shopId: string;
  currentUserId: string;
  requests: SerializedApprovalRequest[];
}

export function ApprovalsView({
  shopId,
  currentUserId,
  requests,
}: ApprovalsViewProps) {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Create Request Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newRequestData, setNewRequestData] = useState({
    requestType: "STOCK_ADJUSTMENT" as "STOCK_ADJUSTMENT" | "LARGE_DISCOUNT" | "SALARY_PAYOUT" | "DUE_WAIVER" | "EXPENSE_APPROVAL",
    referenceId: "",
    amount: "",
    reason: "",
    targetEntity: "",
  });

  // Review Modal
  const [selectedRequest, setSelectedRequest] = useState<SerializedApprovalRequest | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewReason, setReviewReason] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    const matchesFilter =
      filterStatus === "ALL" || req.status === filterStatus;
    const matchesSearch =
      req.requestType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requestedByName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.referenceId && req.referenceId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (req.reviewReason && req.reviewReason.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/v1/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          requestType: newRequestData.requestType,
          referenceId: newRequestData.referenceId || null,
          details: {
            reason: newRequestData.reason,
            amount: newRequestData.amount ? parseFloat(newRequestData.amount) : undefined,
            targetEntity: newRequestData.targetEntity || undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to submit approval request");
      }

      setIsCreateOpen(false);
      setNewRequestData({
        requestType: "STOCK_ADJUSTMENT",
        referenceId: "",
        amount: "",
        reason: "",
        targetEntity: "",
      });
      router.refresh();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setIsSubmittingReview(true);
    setReviewError(null);

    try {
      const res = await fetch(`/api/v1/approvals/${selectedRequest.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          decision: reviewDecision,
          reviewReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to submit decision");
      }

      setIsReviewOpen(false);
      setSelectedRequest(null);
      setReviewReason("");
      router.refresh();
    } catch (err: any) {
      setReviewError(err.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const formatRequestType = (type: string) => {
    switch (type) {
      case "STOCK_ADJUSTMENT":
        return { label: "স্টক সমন্বয়", en: "Stock Adjustment", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
      case "LARGE_DISCOUNT":
        return { label: "বিশেষ মূল্যছাড়", en: "Large Discount", color: "text-purple-500 bg-purple-500/10 border-purple-500/20" };
      case "SALARY_PAYOUT":
        return { label: "বেতন অনুমোদন", en: "Salary Payout", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" };
      case "DUE_WAIVER":
        return { label: "বকেয়া মওকুফ", en: "Due Waiver", color: "text-rose-500 bg-rose-500/10 border-rose-500/20" };
      case "EXPENSE_APPROVAL":
        return { label: "ব্যয় অনুমোদন", en: "Expense Approval", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
      default:
        return { label: type, en: type, color: "text-muted-foreground bg-muted border-border" };
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary" />
            মেকার-চেকার অনুমোদন ব্যবস্থা (Maker-Checker Approvals)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            সংবেদনশীল আর্থিক ও ইনভেন্টরি ট্রানজেকশনের ক্ষেত্রে আত্ম-অনুমোদন সম্পূর্ণ নিষিদ্ধ (Self-approval strictly forbidden)
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="w-4 h-4" />
          নতুন অনুরোধ দাখিল করুন (New Request)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setFilterStatus("PENDING")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            filterStatus === "PENDING"
              ? "bg-amber-500/10 border-amber-500/30 ring-2 ring-amber-500/20"
              : "bg-card border-border hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              অপেক্ষমাণ অনুমোদন (Pending)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-500 mt-2">{pendingCount}</div>
        </div>

        <div
          onClick={() => setFilterStatus("APPROVED")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            filterStatus === "APPROVED"
              ? "bg-emerald-500/10 border-emerald-500/30 ring-2 ring-emerald-500/20"
              : "bg-card border-border hover:border-emerald-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              অনুমোদিত (Approved)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-500 mt-2">{approvedCount}</div>
        </div>

        <div
          onClick={() => setFilterStatus("REJECTED")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            filterStatus === "REJECTED"
              ? "bg-rose-500/10 border-rose-500/30 ring-2 ring-rose-500/20"
              : "bg-card border-border hover:border-rose-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              প্রত্যাখ্যাত (Rejected)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-500 mt-2">{rejectedCount}</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="টাইপ, নাম বা রেফারেন্স দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {status === "ALL" && "সকল (All)"}
              {status === "PENDING" && `অপেক্ষমাণ (${pendingCount})`}
              {status === "APPROVED" && `অনুমোদিত (${approvedCount})`}
              {status === "REJECTED" && `প্রত্যাখ্যাত (${rejectedCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="px-4 py-3">অনুরোধের ধরণ (Type)</th>
                <th className="px-4 py-3">দাখিলকারী (Maker)</th>
                <th className="px-4 py-3">বিবরণ ও রেফারেন্স (Details)</th>
                <th className="px-4 py-3">তারিখ (Date)</th>
                <th className="px-4 py-3">স্ট্যাটাস (Status)</th>
                <th className="px-4 py-3">পর্যালোচক (Checker)</th>
                <th className="px-4 py-3 text-right">পদক্ষেপ (Action)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    কোনো অনুমোদন অনুরোধ পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const typeBadge = formatRequestType(req.requestType);
                  const isOwnRequest = req.requestedById === currentUserId;

                  return (
                    <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${typeBadge.color}`}>
                          {typeBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-foreground">{req.requestedByName}</div>
                        {isOwnRequest && (
                          <span className="text-[10px] text-amber-500 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded">
                            আপনার তৈরি (Self)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {req.referenceId && (
                          <div className="text-xs text-muted-foreground font-mono">
                            Ref: {req.referenceId}
                          </div>
                        )}
                        {req.details && (
                          <div className="text-xs text-foreground/80 line-clamp-2">
                            {typeof req.details.reason === "string" ? req.details.reason : JSON.stringify(req.details)}
                          </div>
                        )}
                        {req.details?.amount !== undefined && (
                          <div className="text-xs font-bold text-primary mt-0.5">
                            {formatBDT(Number(req.details.amount))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {formatDhakaDate(req.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {req.status === "PENDING" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Clock className="w-3 h-3" /> অপেক্ষমাণ
                          </span>
                        )}
                        {req.status === "APPROVED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> অনুমোদিত
                          </span>
                        )}
                        {req.status === "REJECTED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            <XCircle className="w-3 h-3" /> প্রত্যাখ্যাত
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {req.reviewedByName ? (
                          <div>
                            <div className="font-medium text-foreground">{req.reviewedByName}</div>
                            {req.reviewReason && (
                              <div className="text-muted-foreground text-[11px] truncate max-w-xs">
                                &quot;{req.reviewReason}&quot;
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {req.status === "PENDING" ? (
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setReviewDecision("APPROVED");
                              setReviewReason("");
                              setReviewError(null);
                              setIsReviewOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
                          >
                            সিদ্ধান্ত নিন
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">সম্পন্ন</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {isReviewOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  অনুরোধ পর্যালোচনা (Review Request)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  আইডি: {selectedRequest.id}
                </p>
              </div>
              <button
                onClick={() => setIsReviewOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Self-approval Warning Alert */}
            {selectedRequest.requestedById === currentUserId && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>মেকার-চেকার নিয়ম:</strong> আপনি এই অনুরোধটি নিজে তৈরি করেছেন। সিস্টেমের নিয়ম অনুযায়ী আপনি নিজের অনুরোধ নিজে অনুমোদন বা প্রত্যাখ্যান করতে পারবেন না। অন্য অনুমোদিত ব্যবহারকারীকে এটি পর্যালোচনা করতে হবে।
                </div>
              </div>
            )}

            {reviewError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>{reviewError}</div>
              </div>
            )}

            <div className="bg-muted/40 rounded-lg p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ধরণ:</span>
                <span className="font-semibold text-foreground">{selectedRequest.requestType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">দাখিলকারী:</span>
                <span className="font-semibold text-foreground">{selectedRequest.requestedByName}</span>
              </div>
              {selectedRequest.referenceId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">রেফারেন্স:</span>
                  <span className="font-mono text-foreground">{selectedRequest.referenceId}</span>
                </div>
              )}
              {selectedRequest.details && (
                <div className="pt-2 border-t border-border">
                  <span className="text-muted-foreground block mb-1">বিস্তারিত বিবরণ:</span>
                  <pre className="text-[11px] bg-background p-2 rounded border border-border whitespace-pre-wrap font-sans">
                    {JSON.stringify(selectedRequest.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <form onSubmit={handleReview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  সিদ্ধান্ত (Decision) <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewDecision("APPROVED")}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      reviewDecision === "APPROVED"
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                        : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    অনুমোদন (Approve)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision("REJECTED")}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      reviewDecision === "REJECTED"
                        ? "bg-rose-500 text-white border-rose-500 shadow-xs"
                        : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    প্রত্যাখ্যান (Reject)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  পর্যালোচনা বা কারণ (Review Reason) <span className="text-destructive">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder="অনুমোদন বা প্রত্যাখ্যানের কারণ উল্লেখ করুন..."
                  className="w-full text-xs bg-muted/30 border border-border rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsReviewOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  বাতিল (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSubmittingReview ? "দাখিল হচ্ছে..." : "সিদ্ধান্ত সংরক্ষণ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Request Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  নতুন মেকার অনুরোধ (New Maker Request)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  অনুমোদনের জন্য চেকারের কাছে পাঠানো হবে
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>{createError}</div>
              </div>
            )}

            <form onSubmit={handleCreateRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  অনুরোধের ধরণ (Request Type) <span className="text-destructive">*</span>
                </label>
                <select
                  value={newRequestData.requestType}
                  onChange={(e: any) =>
                    setNewRequestData({ ...newRequestData, requestType: e.target.value })
                  }
                  className="w-full text-xs bg-muted/40 border border-border rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="STOCK_ADJUSTMENT">স্টক সমন্বয় (Stock Adjustment)</option>
                  <option value="LARGE_DISCOUNT">বিশেষ মূল্যছাড় (Large Discount)</option>
                  <option value="SALARY_PAYOUT">বেতন অনুমোদন (Salary Payout)</option>
                  <option value="DUE_WAIVER">বকেয়া মওকুফ (Due Waiver)</option>
                  <option value="EXPENSE_APPROVAL">ব্যয় অনুমোদন (Expense Approval)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  রেফারেন্স আইডি / ইনভয়েস নং (যদি থাকে)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: INV-2026-001 বা ADJ-001"
                  value={newRequestData.referenceId}
                  onChange={(e) =>
                    setNewRequestData({ ...newRequestData, referenceId: e.target.value })
                  }
                  className="w-full text-xs bg-muted/40 border border-border rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    টাকার পরিমাণ (যদি প্রযোজ্য হয়)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="৳ 0.00"
                    value={newRequestData.amount}
                    onChange={(e) =>
                      setNewRequestData({ ...newRequestData, amount: e.target.value })
                    }
                    className="w-full text-xs bg-muted/40 border border-border rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    গ্রাহক / পণ্য / সরবরাহকারী
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: রহিম টেলিকম"
                    value={newRequestData.targetEntity}
                    onChange={(e) =>
                      setNewRequestData({ ...newRequestData, targetEntity: e.target.value })
                    }
                    className="w-full text-xs bg-muted/40 border border-border rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  কারণ ও যৌক্তিকতা (Reason / Justification) <span className="text-destructive">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newRequestData.reason}
                  onChange={(e) =>
                    setNewRequestData({ ...newRequestData, reason: e.target.value })
                  }
                  placeholder="কেন এই সমন্বয় বা অনুমোদন প্রয়োজন বিস্তারিত লিখুন..."
                  className="w-full text-xs bg-muted/40 border border-border rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  বাতিল (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSubmitting ? "দাখিল হচ্ছে..." : "অনুরোধ পাঠান"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
