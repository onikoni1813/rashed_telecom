"use client";

import React, { useState } from "react";
import { formatBDT, formatDateTimeDhaka } from "@/lib/i18n";
import {
  Wrench,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Smartphone,
  ShieldCheck,
  FileText,
  Printer,
  X,
  CreditCard,
  Banknote,
  Send,
  ArrowRight,
  PackageCheck,
  DollarSign,
  AlertCircle,
} from "lucide-react";

export interface SerializedJob {
  id: string;
  jobNumber: string;
  deviceBrand: string;
  deviceModel: string;
  deviceImei: string | null;
  deviceColor: string | null;
  intakeCondition: string;
  accessoriesReceived: string | null;
  reportedIssue: string;
  status: string;
  estimatedCost: number;
  labourCost: number;
  partsCost: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  promisedDate: string | null;
  deliveryDate: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  assignedTechnician: {
    id: string;
    fullName: string | null;
    email: string | null;
  } | null;
  diagnostics: Array<{
    id: string;
    diagnosisFindings: string;
    estimatedLabour: number;
    estimatedParts: number;
    customerApproved: boolean | null;
  }>;
  parts: Array<{
    id: string;
    product: { name: string; sku: string };
    quantity: number;
    sellingPrice: number;
    subtotal: number;
  }>;
  warranties: Array<{
    id: string;
    warrantyDays: number;
    warrantyTerms: string;
    endDate: string;
  }>;
}

interface RepairBoardProps {
  shopId: string;
  locationId: string;
  currentUserId: string;
  jobs: SerializedJob[];
  customers: Array<{ id: string; name: string; phone: string }>;
  technicians: Array<{ id: string; fullName: string | null; email: string | null }>;
  spareParts: Array<{
    id: string;
    name: string;
    sku: string;
    sellingPrice: number;
    quantityOnHand: number;
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  INTAKE: { label: "গৃহীত (Intake)", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" },
  DIAGNOSING: { label: "ডায়াগনোসিস", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  ESTIMATE_PENDING: { label: "অনুমোদন বাকি", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  ESTIMATE_APPROVED: { label: "অনুমোদিত", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  IN_REPAIR: { label: "মেরামত চলছে", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  READY_FOR_DELIVERY: { label: "প্রস্তুত (Ready)", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  DELIVERED: { label: "ডেলিভার্ড", bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
  CANCELLED: { label: "বাতিল", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

export function RepairBoard({
  shopId,
  locationId,
  currentUserId,
  jobs,
  customers,
  technicians,
  spareParts,
}: RepairBoardProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeJob, setActiveJob] = useState<SerializedJob | null>(null);

  // Modals
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [showDiagModal, setShowDiagModal] = useState(false);
  const [showPartsModal, setShowPartsModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Intake Form
  const [intakeCustomerId, setIntakeCustomerId] = useState(customers[0]?.id || "");
  const [intakeBrand, setIntakeBrand] = useState("Samsung");
  const [intakeModel, setIntakeModel] = useState("");
  const [intakeImei, setIntakeImei] = useState("");
  const [intakeColor, setIntakeColor] = useState("");
  const [intakeCondition, setIntakeCondition] = useState("");
  const [intakeAccessories, setIntakeAccessories] = useState("");
  const [intakeIssue, setIntakeIssue] = useState("");
  const [intakeTechId, setIntakeTechId] = useState(technicians[0]?.id || "");
  const [intakePromisedDate, setIntakePromisedDate] = useState("");

  // Diag Form
  const [diagFindings, setDiagFindings] = useState("");
  const [diagLabour, setDiagLabour] = useState(500);
  const [diagParts, setDiagParts] = useState(0);
  const [diagApproved, setDiagApproved] = useState(true);

  // Consume Parts Form
  const [selectedPartId, setSelectedPartId] = useState(spareParts[0]?.id || "");
  const [partQty, setPartQty] = useState(1);
  const [partPrice, setPartPrice] = useState(spareParts[0]?.sellingPrice || 0);

  // Deliver Form
  const [deliverMethod, setDeliverMethod] = useState<"CASH" | "BANK" | "BKASH" | "NAGAD">("CASH");
  const [deliverPaidAmount, setDeliverPaidAmount] = useState(0);
  const [deliverWarrantyDays, setDeliverWarrantyDays] = useState(30);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtered jobs
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      search === "" ||
      job.jobNumber.toLowerCase().includes(search.toLowerCase()) ||
      job.deviceModel.toLowerCase().includes(search.toLowerCase()) ||
      job.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      job.customer.phone.includes(search);

    const matchesStatus = statusFilter === "ALL" || job.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Intake submit
  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/service-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `job-intake-${Date.now()}`,
        },
        body: JSON.stringify({
          shopId,
          customerId: intakeCustomerId,
          deviceBrand: intakeBrand,
          deviceModel: intakeModel,
          deviceImei: intakeImei || null,
          deviceColor: intakeColor || null,
          intakeCondition,
          accessoriesReceived: intakeAccessories || null,
          reportedIssue: intakeIssue,
          promisedDate: intakePromisedDate ? new Date(intakePromisedDate).toISOString() : null,
          assignedTechnicianId: intakeTechId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "সার্ভিস গ্রহণ ব্যর্থ হয়েছে");

      setSuccessMsg(`সার্ভিস জব তৈরি সম্পন্ন! জব নং: ${data.data.jobNumber}`);
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Diag submit
  const handleDiagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJob) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/service-jobs/${activeJob.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          diagnostic: {
            diagnosisFindings: diagFindings,
            estimatedLabour: diagLabour,
            estimatedParts: diagParts,
            customerApproved: diagApproved,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "ডায়াগনোসিস সংরক্ষণ করা যায়নি");

      setSuccessMsg("ডায়াগনোসিস ও খরচের অনুমোদন সম্পন্ন!");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Consume Parts submit
  const handlePartsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJob) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/service-jobs/${activeJob.id}/consume-parts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `part-consume-${Date.now()}`,
        },
        body: JSON.stringify({
          shopId,
          locationId,
          productId: selectedPartId,
          quantity: partQty,
          requestedSellingPrice: partPrice,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "পার্টস সংযোজন করা যায়নি");

      setSuccessMsg("স্পেয়ার পার্টস সফলভাবে স্টক থেকে ব্যবহৃত হয়েছে!");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Deliver submit
  const handleDeliverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJob) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/service-jobs/${activeJob.id}/deliver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `job-deliver-${Date.now()}`,
        },
        body: JSON.stringify({
          shopId,
          paymentMethod: deliverMethod,
          paidAmount: deliverPaidAmount,
          warrantyDays: deliverWarrantyDays,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "ডেলিভারি সম্পন্ন করা যায়নি");

      setSuccessMsg("ডিভাইস সফলভাবে গ্রাহকের কাছে হস্তান্তর ও হিসাব সম্পন্ন হয়েছে!");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Servicing Command Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/60 dark:border-white/10 glass-panel p-5 sm:p-6 shadow-xl">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-foreground">
                  মোবাইল সার্ভিসিং ল্যাব বোর্ড
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                  ল্যাব বেঞ্চ • লাইভ
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                ডিভাইস ইনটেক, টেকনিশিয়ান ডায়াগনস্টিক্স, কাস্টমার এস্টিমেট ও পার্টস কনজাম্পশন ট্র্যাকার
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setSuccessMsg(null);
              setShowIntakeModal(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all active:scale-95 whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন ডিভাইস গ্রহণ (Intake - F2)</span>
          </button>
        </div>
      </div>

      {/* Search and Action Bar */}
      <div className="glass-panel p-4 rounded-2xl shadow-sm border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="জব নং, মডেল, গ্রাহকের নাম বা মোবাইল..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-border bg-background/80 text-foreground focus:outline-none focus:ring-4 focus:ring-amber-500/15 focus:border-amber-500 font-medium transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 text-xs font-bold rounded-xl border border-border bg-background/80 text-foreground focus:outline-none focus:ring-4 focus:ring-amber-500/15 focus:border-amber-500 transition-all"
          >
            <option value="ALL">সকল স্ট্যাটাস ({jobs.length})</option>
            <option value="INTAKE">গৃহীত (INTAKE)</option>
            <option value="DIAGNOSING">ডায়াগনোসিস (DIAGNOSING)</option>
            <option value="ESTIMATE_PENDING">অনুমোদন বাকি (PENDING)</option>
            <option value="ESTIMATE_APPROVED">অনুমোদিত (APPROVED)</option>
            <option value="IN_REPAIR">মেরামত চলছে (IN_REPAIR)</option>
            <option value="READY_FOR_DELIVERY">প্রস্তুত (READY)</option>
            <option value="DELIVERED">ডেলিভার্ড (DELIVERED)</option>
          </select>
        </div>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Jobs Table */}
      <div className="border border-border/80 rounded-2xl glass-panel shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider font-semibold border-b">
              <tr>
                <th className="px-4 py-3.5">জব নং (Job No)</th>
                <th className="px-4 py-3.5">গ্রাহকের নাম ও মোবাইল</th>
                <th className="px-4 py-3.5">ডিভাইস বিবরণ</th>
                <th className="px-4 py-3.5">সমস্যা (Issue)</th>
                <th className="px-4 py-3.5">টেকনিশিয়ান</th>
                <th className="px-4 py-3.5 text-center">স্ট্যাটাস</th>
                <th className="px-4 py-3.5 text-right">মোট বিল</th>
                <th className="px-4 py-3.5 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    কোনো মেরামত সার্ভিস রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const badge = STATUS_CONFIG[job.status] || {
                    label: job.status,
                    bg: "bg-slate-100",
                    text: "text-slate-700",
                    border: "border-slate-300",
                  };

                  return (
                    <tr key={job.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-semibold text-primary">
                        {job.jobNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{job.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{job.customer.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">
                          {job.deviceBrand} {job.deviceModel}
                        </div>
                        {job.deviceImei && (
                          <div className="text-xs text-slate-500 font-mono">IMEI: {job.deviceImei}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-xs text-muted-foreground">
                        {job.reportedIssue}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {job.assignedTechnician ? (
                          <span className="font-medium text-foreground">
                            {job.assignedTechnician.fullName || job.assignedTechnician.email}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">অনির্ধারিত</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">
                        {formatBDT(job.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Print Token */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveJob(job);
                              setShowReceiptModal(true);
                            }}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="জব কার্ড প্রিন্ট"
                          >
                            <Printer className="w-4 h-4 text-slate-600" />
                          </button>

                          {/* Diagnose Action */}
                          {(job.status === "INTAKE" || job.status === "DIAGNOSING") && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveJob(job);
                                setDiagFindings(job.diagnostics[0]?.diagnosisFindings || "");
                                setDiagLabour(job.labourCost || 500);
                                setDiagParts(job.partsCost || 0);
                                setShowDiagModal(true);
                              }}
                              className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 border border-blue-200"
                            >
                              ডায়াগনোসিস
                            </button>
                          )}

                          {/* Parts Consumption Action */}
                          {(job.status === "ESTIMATE_APPROVED" || job.status === "IN_REPAIR") && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveJob(job);
                                setShowPartsModal(true);
                              }}
                              className="px-2 py-1 rounded bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100 border border-amber-200"
                            >
                              + পার্টস
                            </button>
                          )}

                          {/* Deliver Action */}
                          {job.status !== "DELIVERED" && job.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveJob(job);
                                setDeliverPaidAmount(job.totalAmount);
                                setShowDeliverModal(true);
                              }}
                              className="px-2 py-1 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-2xs"
                            >
                              ডেলিভারি
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Intake Device Modal */}
      {showIntakeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg text-foreground">
                  নতুন ডিভাইস সার্ভিস গ্রহণ (Intake)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIntakeModal(false)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleIntakeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-1">গ্রাহক নির্বাচন করুন *</label>
                <select
                  value={intakeCustomerId}
                  onChange={(e) => setIntakeCustomerId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border bg-background text-foreground"
                  required
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-foreground mb-1">ব্র্যান্ড (Brand) *</label>
                  <input
                    type="text"
                    value={intakeBrand}
                    onChange={(e) => setIntakeBrand(e.target.value)}
                    placeholder="Samsung / Xiaomi / Apple"
                    className="w-full p-2.5 rounded-lg border bg-background text-foreground"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-foreground mb-1">মডেল (Model) *</label>
                  <input
                    type="text"
                    value={intakeModel}
                    onChange={(e) => setIntakeModel(e.target.value)}
                    placeholder="Galaxy A15 / Redmi 12"
                    className="w-full p-2.5 rounded-lg border bg-background text-foreground"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-foreground mb-1">IMEI / সিরিয়াল নং</label>
                  <input
                    type="text"
                    value={intakeImei}
                    onChange={(e) => setIntakeImei(e.target.value)}
                    placeholder="15 ডিজিট IMEI"
                    className="w-full p-2.5 rounded-lg border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-medium text-foreground mb-1">কালার (Color)</label>
                  <input
                    type="text"
                    value={intakeColor}
                    onChange={(e) => setIntakeColor(e.target.value)}
                    placeholder="Black / Blue / Silver"
                    className="w-full p-2.5 rounded-lg border bg-background text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">ডিভাইসের বর্তমান অবস্থা (Condition) *</label>
                <input
                  type="text"
                  value={intakeCondition}
                  onChange={(e) => setIntakeCondition(e.target.value)}
                  placeholder="যেমন: ফ্রন্ট গ্লাস ফাটা, বডি হালকা দাগযুক্ত"
                  className="w-full p-2.5 rounded-lg border bg-background text-foreground"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">সাথে থাকা এক্সেসরিজ (Accessories)</label>
                <input
                  type="text"
                  value={intakeAccessories}
                  onChange={(e) => setIntakeAccessories(e.target.value)}
                  placeholder="যেমন: কেবল ফোন, সিম ট্রে, ব্যাক কভার"
                  className="w-full p-2.5 rounded-lg border bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">গ্রাহকের বর্ণিত সমস্যা (Reported Issue) *</label>
                <textarea
                  value={intakeIssue}
                  onChange={(e) => setIntakeIssue(e.target.value)}
                  placeholder="যেমন: হাত থেকে পড়ে ডিসপ্লে আলো আসছে না, টাচ কাজ করে না"
                  rows={2}
                  className="w-full p-2.5 rounded-lg border bg-background text-foreground"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-foreground mb-1">নির্ধারিত টেকনিশিয়ান</label>
                  <select
                    value={intakeTechId}
                    onChange={(e) => setIntakeTechId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border bg-background text-foreground"
                  >
                    <option value="">অ্যাসাইন করুন...</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName || t.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-foreground mb-1">সম্ভাব্য ডেলিভারি তারিখ</label>
                  <input
                    type="date"
                    value={intakePromisedDate}
                    onChange={(e) => setIntakePromisedDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[11px] leading-relaxed">
                <strong>নিরাপত্তা সতর্কতা:</strong> গ্রাহকের ডিভাইসের গোপনীয় পিন/পাসওয়ার্ড কখনোই সফটওয়্যারে সেভ করবেন না। ডেলিভারির সময় গ্রাহকের উপস্থিতিতে আনলক করে যাচাই করুন।
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
                  className="px-3 py-2 rounded-lg border hover:bg-muted text-muted-foreground"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? "সংরক্ষণ হচ্ছে..." : "ডিভাইস গ্রহণ সম্পন্ন করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Diagnosis & Estimate Modal */}
      {showDiagModal && activeJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-foreground">
                ডায়াগনোসিস ও খরচের হিসাব ({activeJob.jobNumber})
              </h3>
              <button type="button" onClick={() => setShowDiagModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDiagSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-1">টেকনিক্যাল পর্যবেক্ষণ (Findings) *</label>
                <textarea
                  value={diagFindings}
                  onChange={(e) => setDiagFindings(e.target.value)}
                  placeholder="যেমন: ডিসপ্লে প্যানেল পুরোপুরি নষ্ট। মাদারবোর্ড ও চার্জিং ওকে।"
                  rows={2}
                  className="w-full p-2.5 rounded-lg border bg-background text-foreground"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-foreground mb-1">মজুরি খরচ (Labour ৳)</label>
                  <input
                    type="number"
                    min="0"
                    value={diagLabour}
                    onChange={(e) => setDiagLabour(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-medium text-foreground mb-1">সম্ভাব্য পার্টস খরচ (৳)</label>
                  <input
                    type="number"
                    min="0"
                    value={diagParts}
                    onChange={(e) => setDiagParts(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg flex justify-between items-center font-semibold text-sm">
                <span>মোট সম্ভাব্য খরচ:</span>
                <span className="text-primary font-bold">{formatBDT(diagLabour + diagParts)}</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="diagApprove"
                  checked={diagApproved}
                  onChange={(e) => setDiagApproved(e.target.checked)}
                  className="rounded border text-primary"
                />
                <label htmlFor="diagApprove" className="text-xs text-foreground font-medium">
                  গ্রাহক ফোনে মৌখিক খরচের অনুমোদন দিয়েছেন
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowDiagModal(false)}
                  className="px-3 py-2 rounded-lg border text-muted-foreground"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "সংরক্ষণ হচ্ছে..." : "ডায়াগনোসিস নিশ্চিত করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Consume Spare Parts Modal */}
      {showPartsModal && activeJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-foreground">
                স্পেয়ার পার্টস সংযোজন ({activeJob.jobNumber})
              </h3>
              <button type="button" onClick={() => setShowPartsModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePartsSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-foreground mb-1">মজুদ পার্টস নির্বাচন করুন *</label>
                <select
                  value={selectedPartId}
                  onChange={(e) => {
                    setSelectedPartId(e.target.value);
                    const p = spareParts.find((sp) => sp.id === e.target.value);
                    if (p) setPartPrice(p.sellingPrice);
                  }}
                  className="w-full p-2.5 rounded-lg border bg-background text-foreground"
                  required
                >
                  {spareParts.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name} (মজুদ: {sp.quantityOnHand} টি | বিক্রয়: {formatBDT(sp.sellingPrice)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-foreground mb-1">পরিমাণ (Quantity)</label>
                  <input
                    type="number"
                    min="1"
                    value={partQty}
                    onChange={(e) => setPartQty(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border bg-background text-foreground"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-foreground mb-1">বিল প্রাইস (Price ৳)</label>
                  <input
                    type="number"
                    min="0"
                    value={partPrice}
                    onChange={(e) => setPartPrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border bg-background text-foreground"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg flex justify-between items-center font-semibold text-sm">
                <span>পার্টস মোট বিল:</span>
                <span className="text-primary font-bold">{formatBDT(partQty * partPrice)}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowPartsModal(false)}
                  className="px-3 py-2 rounded-lg border text-muted-foreground"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-50"
                >
                  {loading ? "সংযোজন হচ্ছে..." : "স্টক থেকে ব্যবহার করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Deliver & Bill Collection Modal */}
      {showDeliverModal && activeJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-foreground">
                ডিভাইস হস্তান্তর ও বিল গ্রহণ ({activeJob.jobNumber})
              </h3>
              <button type="button" onClick={() => setShowDeliverModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeliverSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-muted rounded-lg space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ডিভাইস:</span>
                  <span className="font-semibold text-foreground">{activeJob.deviceBrand} {activeJob.deviceModel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">গ্রাহক:</span>
                  <span className="font-semibold text-foreground">{activeJob.customer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">মজুরি (Labour):</span>
                  <span>{formatBDT(activeJob.labourCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">পার্টস (Parts):</span>
                  <span>{formatBDT(activeJob.partsCost)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t">
                  <span>সর্বমোট বিল (Total):</span>
                  <span className="text-primary">{formatBDT(activeJob.totalAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">পেমেন্ট মেথড *</label>
                <select
                  value={deliverMethod}
                  onChange={(e) => setDeliverMethod(e.target.value as any)}
                  className="w-full p-2.5 rounded-lg border bg-background text-foreground"
                >
                  <option value="CASH">ক্যাশ (Cash)</option>
                  <option value="BKASH">বিকাশ (bKash)</option>
                  <option value="NAGAD">নগদ (Nagad)</option>
                  <option value="BANK">ব্যাংক ট্রান্সফার</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">আদায়কৃত টাকা (Paid Amount) *</label>
                <input
                  type="number"
                  min="0"
                  max={activeJob.totalAmount}
                  value={deliverPaidAmount}
                  onChange={(e) => setDeliverPaidAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border bg-background text-foreground"
                  required
                />
              </div>

              {activeJob.totalAmount - deliverPaidAmount > 0 && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-semibold flex justify-between">
                  <span>গ্রাহক বকেয়া (Due):</span>
                  <span>{formatBDT(activeJob.totalAmount - deliverPaidAmount)}</span>
                </div>
              )}

              <div>
                <label className="block font-medium text-foreground mb-1">ওয়ারেন্টি মেয়াদ (দিন)</label>
                <input
                  type="number"
                  min="0"
                  value={deliverWarrantyDays}
                  onChange={(e) => setDeliverWarrantyDays(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border bg-background text-foreground"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowDeliverModal(false)}
                  className="px-3 py-2 rounded-lg border text-muted-foreground"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? "হস্তান্তর হচ্ছে..." : "ডেলিভারি সম্পন্ন করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Printable Job Card / Cash Memo */}
      {showReceiptModal && activeJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-foreground">
                সার্ভিস জব কার্ড / রসিদ
              </h3>
              <button type="button" onClick={() => setShowReceiptModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Area */}
            <div className="bg-white text-slate-900 p-5 rounded-xl border border-slate-200 text-xs font-mono space-y-3">
              <div className="text-center border-b border-dashed border-slate-300 pb-2">
                <h2 className="text-base font-black tracking-wider text-slate-950">RASHED TELECOM</h2>
                <p className="text-[11px] text-slate-600">Mobile Servicing & Hardware Repair</p>
                <p className="text-[11px] text-slate-500">কালিয়াকৈর, গাজীপুর | হেল্পলাইন: 01712-000000</p>
              </div>

              <div className="flex justify-between border-b border-dashed border-slate-300 pb-2">
                <div>
                  <div><span className="font-bold">জব নং:</span> {activeJob.jobNumber}</div>
                  <div><span className="font-bold">তারিখ:</span> {formatDateTimeDhaka(new Date(activeJob.createdAt))}</div>
                </div>
                <div className="text-right">
                  <div><span className="font-bold">গ্রাহক:</span> {activeJob.customer.name}</div>
                  <div><span className="font-bold">মোবাইল:</span> {activeJob.customer.phone}</div>
                </div>
              </div>

              <div className="space-y-1">
                <div><span className="font-bold">ডিভাইস:</span> {activeJob.deviceBrand} {activeJob.deviceModel}</div>
                {activeJob.deviceImei && <div><span className="font-bold">IMEI:</span> {activeJob.deviceImei}</div>}
                <div><span className="font-bold">অবস্থা:</span> {activeJob.intakeCondition}</div>
                <div><span className="font-bold">অভিযোগ:</span> {activeJob.reportedIssue}</div>
              </div>

              {activeJob.parts.length > 0 && (
                <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                  <div className="font-bold">ব্যবহৃত পার্টস:</div>
                  {activeJob.parts.map((p, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span>{p.product.name} x{p.quantity}</span>
                      <span>{formatBDT(p.subtotal)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>মজুরি বিল (Labour):</span>
                  <span>{formatBDT(activeJob.labourCost)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-950 pt-1 border-t">
                  <span>সর্বমোট বিল (Total):</span>
                  <span>{formatBDT(activeJob.totalAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-700">
                  <span>পরিশোধিত (Paid):</span>
                  <span>{formatBDT(activeJob.paidAmount)}</span>
                </div>
                {activeJob.dueAmount > 0 && (
                  <div className="flex justify-between font-bold text-rose-600">
                    <span>বকেয়া (Due):</span>
                    <span>{formatBDT(activeJob.dueAmount)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 text-[10px] text-slate-500 leading-tight">
                * ডেলিভারির সময় এই স্লিপ সাথে আনতে হবে। ৩০ দিন পর অপসারিত না হলে কর্তৃপক্ষ দায়ী থাকবে না।
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>প্রিন্ট করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
