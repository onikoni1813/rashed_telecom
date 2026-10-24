"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBDT, formatDhakaDate } from "@/lib/i18n";
import {
  Users,
  UserCheck,
  Calendar,
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Briefcase,
  DollarSign,
  Phone,
  Mail,
  X,
} from "lucide-react";

export interface SerializedStaffMember {
  id: string;
  employeeCode: string;
  fullName: string;
  phone: string;
  email: string | null;
  designation: string | null;
  department: string | null;
  roleName: string;
  roleId: string;
  compensationType: string;
  baseSalary: number;
  commissionRate: number;
  isActive: boolean;
  joiningDate: string;
}

export interface SerializedAttendance {
  id: string;
  staffProfileId: string;
  staffName: string;
  employeeCode: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
  checkInTime: string | null;
  checkOutTime: string | null;
  notes: string | null;
}

export interface SerializedPayroll {
  id: string;
  staffName: string;
  employeeCode: string;
  payrollMonth: string;
  baseSalary: number;
  commissionAmount: number;
  deductions: number;
  netAmount: number;
  paymentMethod: string;
  paidDate: string;
  paidByName: string;
  journalEntryId: string | null;
  notes: string | null;
}

export interface SerializedRole {
  id: string;
  name: string;
  description: string | null;
}

interface StaffViewProps {
  shopId: string;
  staffList: SerializedStaffMember[];
  attendanceList: SerializedAttendance[];
  payrollList: SerializedPayroll[];
  roles: SerializedRole[];
}

export function StaffView({
  shopId,
  staffList,
  attendanceList,
  payrollList,
  roles,
}: StaffViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"STAFF" | "ATTENDANCE" | "PAYROLL">("STAFF");
  const [searchTerm, setSearchTerm] = useState("");

  // Add Staff Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [newStaffData, setNewStaffData] = useState({
    fullName: "",
    phone: "",
    email: "",
    roleId: roles[0]?.id || "",
    designation: "বিক্রয় প্রতিনিধি (Sales Rep)",
    department: "Sales & POS",
    baseSalary: "15000",
    commissionRate: "0",
    compensationType: "SALARY" as "SALARY" | "COMMISSION" | "SALARY_PLUS_COMMISSION",
  });

  // Mark Attendance Modal
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceStaff, setAttendanceStaff] = useState<SerializedStaffMember | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<"PRESENT" | "ABSENT" | "LATE" | "LEAVE">("PRESENT");
  const [attendanceNotes, setAttendanceNotes] = useState("");
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);

  // Disburse Salary Modal
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [payrollStaffId, setPayrollStaffId] = useState(staffList[0]?.id || "");
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [baseSalaryInput, setBaseSalaryInput] = useState(staffList[0]?.baseSalary.toString() || "0");
  const [commissionInput, setCommissionInput] = useState("0");
  const [deductionsInput, setDeductionsInput] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK" | "BKASH" | "NAGAD">("CASH");
  const [payrollNotes, setPayrollNotes] = useState("");
  const [isSubmittingPayroll, setIsSubmittingPayroll] = useState(false);
  const [payrollError, setPayrollError] = useState<string | null>(null);

  const filteredStaff = staffList.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm) ||
      (s.designation && s.designation.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);

    const base = parseFloat(newStaffData.baseSalary);
    if (isNaN(base) || base < 0) {
      setStaffError("সঠিক মূল বেতন প্রদান করুন।");
      return;
    }

    setIsSubmittingStaff(true);
    try {
      const res = await fetch("/api/v1/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          fullName: newStaffData.fullName.trim(),
          phone: newStaffData.phone.trim(),
          email: newStaffData.email.trim() || undefined,
          roleId: newStaffData.roleId,
          designation: newStaffData.designation.trim() || undefined,
          department: newStaffData.department.trim() || undefined,
          baseSalary: base,
          commissionRate: parseFloat(newStaffData.commissionRate) || 0,
          compensationType: newStaffData.compensationType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "কর্মী যোগ করা যায়নি।");

      setIsStaffModalOpen(false);
      setNewStaffData({
        fullName: "",
        phone: "",
        email: "",
        roleId: roles[0]?.id || "",
        designation: "বিক্রয় প্রতিনিধি (Sales Rep)",
        department: "Sales & POS",
        baseSalary: "15000",
        commissionRate: "0",
        compensationType: "SALARY",
      });
      router.refresh();
    } catch (err: unknown) {
      setStaffError(err instanceof Error ? err.message : "ত্রুটি হয়েছে");
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceStaff) return;

    setIsSubmittingAttendance(true);
    try {
      const res = await fetch("/api/v1/staff/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          staffProfileId: attendanceStaff.id,
          status: attendanceStatus,
          notes: attendanceNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "উপস্থিতি সংরক্ষণ করা যায়নি।");

      setIsAttendanceModalOpen(false);
      setAttendanceStaff(null);
      setAttendanceNotes("");
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "ত্রুটি হয়েছে");
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  const handlePayrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayrollError(null);

    const base = parseFloat(baseSalaryInput) || 0;
    const comm = parseFloat(commissionInput) || 0;
    const ded = parseFloat(deductionsInput) || 0;
    const net = base + comm - ded;

    if (net <= 0) {
      setPayrollError("নিট বেতন ০ এর বেশি হতে হবে।");
      return;
    }

    setIsSubmittingPayroll(true);
    try {
      const res = await fetch("/api/v1/staff/payroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `pay-${payrollStaffId}-${payrollMonth}-${Date.now()}`,
        },
        body: JSON.stringify({
          shopId,
          staffProfileId: payrollStaffId,
          payrollMonth,
          baseSalary: base,
          commissionAmount: comm,
          deductions: ded,
          paymentMethod,
          notes: payrollNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "বেতন প্রদান করা যায়নি।");

      setIsPayrollModalOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setPayrollError(err instanceof Error ? err.message : "ত্রুটি হয়েছে");
    } finally {
      setIsSubmittingPayroll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-card p-6 rounded-xl border shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="w-7 h-7 text-primary" />
            কর্মচারী ব্যবস্থাপনা ও পে-রোল (Staff & Payroll Operations)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            দোকানের সকল কর্মচারীদের প্রোফাইল, দৈনিক উপস্থিতি এবং নিয়মিত বেতন-ভাতা সংক্রান্ত হিসাব।
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "STAFF" && (
            <button
              onClick={() => setIsStaffModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              নতুন কর্মী যোগ করুন
            </button>
          )}

          {activeTab === "PAYROLL" && (
            <button
              onClick={() => setIsPayrollModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 shadow-xs"
            >
              <CreditCard className="w-4 h-4" />
              বেতন প্রদান করুন (Disburse Salary)
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-1 sm:space-x-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("STAFF")}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === "STAFF"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          কর্মচারী তালিকা ({staffList.length})
        </button>

        <button
          onClick={() => setActiveTab("ATTENDANCE")}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === "ATTENDANCE"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="w-4 h-4" />
          দৈনিক উপস্থিতি (Attendance)
        </button>

        <button
          onClick={() => setActiveTab("PAYROLL")}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === "PAYROLL"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          বেতন ও কমিশন বিতরণ (Payroll)
        </button>
      </div>

      {/* TAB 1: STAFF LIST */}
      {activeTab === "STAFF" && (
        <div className="space-y-4">
          <div className="bg-card p-4 rounded-xl border shadow-xs">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="নাম, আইডি কোড, পদবী বা মোবাইল দিয়ে খুঁজুন..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border bg-background focus:outline-hidden"
              />
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                  <tr>
                    <th className="px-4 py-3">আইডি কোড</th>
                    <th className="px-4 py-3">কর্মচারীর নাম</th>
                    <th className="px-4 py-3">পদবী ও বিভাগ</th>
                    <th className="px-4 py-3">রোল (System Role)</th>
                    <th className="px-4 py-3">যোগাযোগ</th>
                    <th className="px-4 py-3 text-right">মূল বেতন (৳)</th>
                    <th className="px-4 py-3 text-center">উপস্থিতি</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        কোন কর্মী পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((staff) => (
                      <tr key={staff.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono font-bold text-primary">
                          {staff.employeeCode}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {staff.fullName}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{staff.designation}</div>
                          <div className="text-xs text-muted-foreground">{staff.department}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {staff.roleName}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          <div>{staff.phone}</div>
                          {staff.email && <div>{staff.email}</div>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                          {formatBDT(staff.baseSalary)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              setAttendanceStaff(staff);
                              setIsAttendanceModalOpen(true);
                            }}
                            className="text-xs font-medium px-2.5 py-1 rounded-md border hover:bg-muted"
                          >
                            হাজিরা দিন
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

      {/* TAB 2: ATTENDANCE */}
      {activeTab === "ATTENDANCE" && (
        <div className="space-y-4">
          <div className="bg-card p-5 rounded-xl border shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                আজকের উপস্থিতি রেকর্ড ({formatDhakaDate(new Date())})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                কর্মচারীদের দৈনিক উপস্থিতি ও সময়মত আগমন ট্র্যাক করুন।
              </p>
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                  <tr>
                    <th className="px-4 py-3">আইডি কোড</th>
                    <th className="px-4 py-3">কর্মচারী</th>
                    <th className="px-4 py-3">স্ট্যাটাস</th>
                    <th className="px-4 py-3">আগমনের সময়</th>
                    <th className="px-4 py-3">মন্তব্য</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {attendanceList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted-foreground">
                        আজকের জন্য এখনও কোন হাজিরা রেকর্ড করা হয়নি।
                      </td>
                    </tr>
                  ) : (
                    attendanceList.map((att) => (
                      <tr key={att.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono font-bold text-primary">
                          {att.employeeCode}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {att.staffName}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                              att.status === "PRESENT"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : att.status === "LATE"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                            }`}
                          >
                            {att.status === "PRESENT"
                              ? "উপস্থিত (Present)"
                              : att.status === "LATE"
                              ? "বিলম্বিত (Late)"
                              : att.status === "LEAVE"
                              ? "ছুটি (Leave)"
                              : "অনুপস্থিত (Absent)"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {att.checkInTime ? formatDhakaDate(new Date(att.checkInTime)) : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {att.notes || "—"}
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

      {/* TAB 3: PAYROLL */}
      {activeTab === "PAYROLL" && (
        <div className="space-y-4">
          <div className="bg-card p-5 rounded-xl border shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                মাসিক বেতন ও ভাতা প্রদান বিবরণী (Payroll Disbursed)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                বেতন প্রদানের সাথে সাথে সাধারণ খতিয়ানে (Account 6100 Salaries) সুষম দাখিলা পোস্ট হয়।
              </p>
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                  <tr>
                    <th className="px-4 py-3">বেতন মাস</th>
                    <th className="px-4 py-3">কর্মচারী</th>
                    <th className="px-4 py-3 text-right">মূল বেতন (৳)</th>
                    <th className="px-4 py-3 text-right">কমিশন (৳)</th>
                    <th className="px-4 py-3 text-right">কর্তন (৳)</th>
                    <th className="px-4 py-3 text-right">নিট বেতন (৳)</th>
                    <th className="px-4 py-3">মাধ্যম</th>
                    <th className="px-4 py-3">প্রদানের তারিখ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payrollList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-muted-foreground">
                        এখনও কোন বেতনের রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    payrollList.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono font-bold text-primary">
                          {p.payrollMonth}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {p.staffName} ({p.employeeCode})
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {formatBDT(p.baseSalary)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600">
                          {p.commissionAmount > 0 ? `+ ${formatBDT(p.commissionAmount)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-rose-600">
                          {p.deductions > 0 ? `- ${formatBDT(p.deductions)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatBDT(p.netAmount)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-md bg-muted font-semibold">
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDhakaDate(new Date(p.paidDate))}
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

      {/* ADD STAFF MODAL */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border shadow-xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                নতুন কর্মী যুক্ত করুন (Add Staff Profile)
              </h2>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {staffError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{staffError}</span>
              </div>
            )}

            <form onSubmit={handleStaffSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  কর্মচারীর নাম (Full Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মোঃ কামরুল হাসান"
                  value={newStaffData.fullName}
                  onChange={(e) => setNewStaffData({ ...newStaffData, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    মোবাইল নম্বর *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="017XXXXXXXX"
                    value={newStaffData.phone}
                    onChange={(e) => setNewStaffData({ ...newStaffData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    ইমেইল (ঐচ্ছিক)
                  </label>
                  <input
                    type="email"
                    placeholder="staff@rashedtelecom.local"
                    value={newStaffData.email}
                    onChange={(e) => setNewStaffData({ ...newStaffData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    পদবী (Designation)
                  </label>
                  <input
                    type="text"
                    value={newStaffData.designation}
                    onChange={(e) =>
                      setNewStaffData({ ...newStaffData, designation: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    সিস্টেম রোল (Role) *
                  </label>
                  <select
                    value={newStaffData.roleId}
                    onChange={(e) => setNewStaffData({ ...newStaffData, roleId: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    মূল বেতন (Base Salary ৳) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newStaffData.baseSalary}
                    onChange={(e) =>
                      setNewStaffData({ ...newStaffData, baseSalary: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    কমিশন হার (% ঐচ্ছিক)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newStaffData.commissionRate}
                    onChange={(e) =>
                      setNewStaffData({ ...newStaffData, commissionRate: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg border hover:bg-muted"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStaff}
                  className="px-5 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmittingStaff ? "সংরক্ষণ হচ্ছে..." : "কর্মী প্রোফাইল সংরক্ষণ করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MARK ATTENDANCE MODAL */}
      {isAttendanceModalOpen && attendanceStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl border shadow-xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b">
              <h2 className="text-base font-bold text-foreground">
                হাজিরা প্রদান: {attendanceStaff.fullName}
              </h2>
              <button
                onClick={() => setIsAttendanceModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAttendanceSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  উপস্থিতির স্ট্যাটাস *
                </label>
                <select
                  value={attendanceStatus}
                  onChange={(e) =>
                    setAttendanceStatus(
                      e.target.value as "PRESENT" | "ABSENT" | "LATE" | "LEAVE"
                    )
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background font-semibold"
                >
                  <option value="PRESENT">উপস্থিত (Present)</option>
                  <option value="LATE">দেরিতে আগমন (Late)</option>
                  <option value="LEAVE">ছুটি (Leave)</option>
                  <option value="ABSENT">অনুপস্থিত (Absent)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  নোট / মন্তব্য (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: অনুমোদিত ছুটি বা কারণ..."
                  value={attendanceNotes}
                  onChange={(e) => setAttendanceNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAttendanceModalOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg border hover:bg-muted"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAttendance}
                  className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmittingAttendance ? "সংরক্ষণ হচ্ছে..." : "হাজিরা সংরক্ষণ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISBURSE PAYROLL MODAL */}
      {isPayrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border shadow-xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b">
              <h2 className="text-lg font-bold flex items-center gap-2 text-emerald-600">
                <CreditCard className="w-5 h-5" />
                মাসিক বেতন ও ভাতা বিতরণ (Disburse Salary)
              </h2>
              <button
                onClick={() => setIsPayrollModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {payrollError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{payrollError}</span>
              </div>
            )}

            <form onSubmit={handlePayrollSubmit} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  কর্মচারী নির্বাচন করুন *
                </label>
                <select
                  value={payrollStaffId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPayrollStaffId(id);
                    const selected = staffList.find((s) => s.id === id);
                    if (selected) {
                      setBaseSalaryInput(selected.baseSalary.toString());
                    }
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background font-medium"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.employeeCode}) - মূল বেতন: ৳{s.baseSalary}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    বেতন মাস (YYYY-MM) *
                  </label>
                  <input
                    type="month"
                    required
                    value={payrollMonth}
                    onChange={(e) => setPayrollMonth(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    পরিশোধ মাধ্যম *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as "CASH" | "BANK" | "BKASH" | "NAGAD")
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                  >
                    <option value="CASH">ক্যাশ (Cash on Hand 1000)</option>
                    <option value="BKASH">বিকাশ (bKash 1010)</option>
                    <option value="NAGAD">নগদ (Nagad 1010)</option>
                    <option value="BANK">ব্যাংক অ্যাকাউন্ট (Bank 1010)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    মূল বেতন (৳) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={baseSalaryInput}
                    onChange={(e) => setBaseSalaryInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-background font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    কমিশন / বোনাস (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={commissionInput}
                    onChange={(e) => setCommissionInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-background font-mono text-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    কর্তন (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={deductionsInput}
                    onChange={(e) => setDeductionsInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-background font-mono text-rose-600"
                  />
                </div>
              </div>

              <div className="bg-muted/40 p-3 rounded-lg flex items-center justify-between text-sm font-bold">
                <span className="text-foreground">নিট প্রদেয় বেতন:</span>
                <span className="text-emerald-600 font-mono text-base">
                  {formatBDT(
                    Math.max(
                      0,
                      (parseFloat(baseSalaryInput) || 0) +
                        (parseFloat(commissionInput) || 0) -
                        (parseFloat(deductionsInput) || 0)
                    )
                  )}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  মন্তব্য / নোট
                </label>
                <input
                  type="text"
                  placeholder="যেমন: অক্টোবর মাসের বেতন ও সার্ভিসিং কমিশন"
                  value={payrollNotes}
                  onChange={(e) => setPayrollNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background"
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPayrollModalOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg border hover:bg-muted"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayroll}
                  className="px-5 py-2 text-sm rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmittingPayroll ? "প্রদান হচ্ছে..." : "বেতন অনুমোদন ও পোস্টিং"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
