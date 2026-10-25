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
      {/* Elevated Command Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-r from-card/90 via-card/60 to-card/90 p-6 sm:p-7 backdrop-blur-xl shadow-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-20 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 ring-2 ring-white/10 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  কর্মচারী ব্যবস্থাপনা ও পে-রোল
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                  <UserCheck className="w-3 h-3" />
                  Staff Operations
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                সকল কর্মচারীদের প্রোফাইল, দৈনিক বায়োমেট্রিক উপস্থিতি এবং নিয়মিত বেতন-ভাতা বিতরণ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "STAFF" && (
              <button
                onClick={() => setIsStaffModalOpen(true)}
                className="shimmer-button inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 hover:brightness-110 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন কর্মী যোগ করুন</span>
              </button>
            )}

            {activeTab === "PAYROLL" && (
              <button
                onClick={() => setIsPayrollModalOpen(true)}
                className="shimmer-button inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 hover:brightness-110 transition-all cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>বেতন প্রদান করুন</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Pill Tabs Bar */}
      <div className="glass-panel p-1.5 rounded-2xl border border-border/60 backdrop-blur-xl flex items-center gap-2 overflow-x-auto shadow-md">
        <button
          onClick={() => setActiveTab("STAFF")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "STAFF"
              ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>কর্মচারী তালিকা ({staffList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("ATTENDANCE")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "ATTENDANCE"
              ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>দৈনিক উপস্থিতি</span>
        </button>

        <button
          onClick={() => setActiveTab("PAYROLL")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "PAYROLL"
              ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>বেতন ও কমিশন বিতরণ</span>
        </button>
      </div>

      {/* TAB 1: STAFF LIST */}
      {activeTab === "STAFF" && (
        <div className="space-y-4">
          <div className="glass-panel p-3.5 rounded-2xl border border-border/60 backdrop-blur-xl shadow-md">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="নাম, আইডি কোড, পদবী বা মোবাইল দিয়ে খুঁজুন..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-card/80 rounded-xl border border-border/70 focus:outline-hidden focus:ring-2 focus:ring-cyan-500/30 transition-all font-medium"
              />
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-border/60 overflow-hidden shadow-xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/70 backdrop-blur-md border-b border-border/60 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">আইডি কোড</th>
                    <th className="px-4 py-3.5">কর্মচারীর নাম</th>
                    <th className="px-4 py-3.5">পদবী ও বিভাগ</th>
                    <th className="px-4 py-3.5">সিস্টেম রোল</th>
                    <th className="px-4 py-3.5">যোগাযোগ</th>
                    <th className="px-4 py-3.5 text-right">মূল বেতন (৳)</th>
                    <th className="px-4 py-3.5 text-center">উপস্থিতি</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-muted-foreground">
                        <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="font-bold text-base text-foreground">কোন কর্মী পাওয়া যায়নি</p>
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((staff) => (
                      <tr key={staff.id} className="hover:bg-cyan-500/5 transition-colors group">
                        <td className="px-5 py-4 font-mono font-bold text-primary group-hover:text-cyan-500 transition-colors">
                          {staff.employeeCode}
                        </td>
                        <td className="px-4 py-4 font-bold text-foreground">
                          {staff.fullName}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-foreground text-xs">{staff.designation}</div>
                          <div className="text-[11px] text-muted-foreground">{staff.department}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                            {staff.roleName}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs text-muted-foreground">
                          <div className="font-semibold text-foreground">{staff.phone}</div>
                          {staff.email && <div className="text-[11px]">{staff.email}</div>}
                        </td>
                        <td className="px-4 py-4 text-right font-mono font-black text-foreground">
                          {formatBDT(staff.baseSalary)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => {
                              setAttendanceStaff(staff);
                              setIsAttendanceModalOpen(true);
                            }}
                            className="shimmer-button inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs hover:brightness-110 transition-all cursor-pointer"
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
          <div className="glass-panel p-5 rounded-2xl border border-border/60 backdrop-blur-xl flex items-center justify-between shadow-md">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-500" />
                আজকের উপস্থিতি রেকর্ড ({formatDhakaDate(new Date())})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                কর্মচারীদের দৈনিক উপস্থিতি ও সময়মত আগমন পর্যবেক্ষণ করুন।
              </p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-border/60 overflow-hidden shadow-xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/70 backdrop-blur-md border-b border-border/60 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">আইডি কোড</th>
                    <th className="px-4 py-3.5">কর্মচারী</th>
                    <th className="px-4 py-3.5">স্ট্যাটাস</th>
                    <th className="px-4 py-3.5">আগমনের সময়</th>
                    <th className="px-4 py-3.5">মন্তব্য</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {attendanceList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-16 text-muted-foreground">
                        <Calendar className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="font-bold text-base text-foreground">আজকের জন্য এখনও কোন হাজিরা রেকর্ড করা হয়নি</p>
                      </td>
                    </tr>
                  ) : (
                    attendanceList.map((att) => (
                      <tr key={att.id} className="hover:bg-cyan-500/5 transition-colors group">
                        <td className="px-5 py-4 font-mono font-bold text-primary group-hover:text-cyan-500 transition-colors">
                          {att.employeeCode}
                        </td>
                        <td className="px-4 py-4 font-bold text-foreground">
                          {att.staffName}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-bold inline-flex items-center gap-1.5 ${
                              att.status === "PRESENT"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : att.status === "LATE"
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              att.status === "PRESENT" ? "bg-emerald-500" : att.status === "LATE" ? "bg-amber-500" : "bg-rose-500"
                            }`} />
                            {att.status === "PRESENT"
                              ? "উপস্থিত"
                              : att.status === "LATE"
                              ? "বিলম্বিত"
                              : att.status === "LEAVE"
                              ? "ছুটি"
                              : "অনুপস্থিত"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs text-muted-foreground font-medium">
                          {att.checkInTime ? formatDhakaDate(new Date(att.checkInTime)) : "—"}
                        </td>
                        <td className="px-4 py-4 text-xs text-muted-foreground font-medium">
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
          <div className="glass-panel p-5 rounded-2xl border border-border/60 backdrop-blur-xl flex items-center justify-between shadow-md">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                মাসিক বেতন ও ভাতা প্রদান বিবরণী
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                বেতন প্রদানের সাথে সাথে সাধারণ খতিয়ানে (Account 6100 Salaries) সুষম দাখিলা পোস্ট হয়।
              </p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-border/60 overflow-hidden shadow-xl backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/70 backdrop-blur-md border-b border-border/60 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">বেতন মাস</th>
                    <th className="px-4 py-3.5">কর্মচারী</th>
                    <th className="px-4 py-3.5 text-right">মূল বেতন (৳)</th>
                    <th className="px-4 py-3.5 text-right">কমিশন (৳)</th>
                    <th className="px-4 py-3.5 text-right">কর্তন (৳)</th>
                    <th className="px-4 py-3.5 text-right">নিট বেতন (৳)</th>
                    <th className="px-4 py-3.5">মাধ্যম</th>
                    <th className="px-4 py-3.5">প্রদানের তারিখ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {payrollList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-muted-foreground">
                        <CreditCard className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="font-bold text-base text-foreground">এখনও কোন বেতনের রেকর্ড পাওয়া যায়নি</p>
                      </td>
                    </tr>
                  ) : (
                    payrollList.map((p) => (
                      <tr key={p.id} className="hover:bg-emerald-500/5 transition-colors group">
                        <td className="px-5 py-4 font-mono font-bold text-primary group-hover:text-emerald-500 transition-colors">
                          {p.payrollMonth}
                        </td>
                        <td className="px-4 py-4 font-bold text-foreground">
                          {p.staffName} ({p.employeeCode})
                        </td>
                        <td className="px-4 py-4 text-right font-mono font-bold text-foreground">
                          {formatBDT(p.baseSalary)}
                        </td>
                        <td className="px-4 py-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {p.commissionAmount > 0 ? `+ ${formatBDT(p.commissionAmount)}` : "—"}
                        </td>
                        <td className="px-4 py-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          {p.deductions > 0 ? `- ${formatBDT(p.deductions)}` : "—"}
                        </td>
                        <td className="px-4 py-4 text-right font-mono font-black text-foreground">
                          {formatBDT(p.netAmount)}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-muted/60 border border-border/60 text-foreground">
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs text-muted-foreground font-medium whitespace-nowrap">
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
                নতুন কর্মী যুক্ত করুন
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
                  কর্মচারীর নাম *
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
                    পদবী
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
                    সিস্টেম রোল *
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
                    মূল বেতন (৳) *
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
                  <option value="PRESENT">উপস্থিত</option>
                  <option value="LATE">দেরিতে আগমন</option>
                  <option value="LEAVE">ছুটি</option>
                  <option value="ABSENT">অনুপস্থিত</option>
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
                মাসিক বেতন ও ভাতা বিতরণ
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
                    বেতন মাস *
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
                    <option value="CASH">ক্যাশ (হাতে নগদ)</option>
                    <option value="BKASH">বিকাশ</option>
                    <option value="NAGAD">নগদ</option>
                    <option value="BANK">ব্যাংক অ্যাকাউন্ট</option>
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
