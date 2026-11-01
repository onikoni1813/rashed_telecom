import React, { Suspense } from "react";
import { prisma } from "@/lib/db/prisma";
import {
  getStaffList,
  getAttendanceList,
  getPayrollList,
} from "@/features/staff/staff-service";
import {
  StaffView,
  SerializedStaffMember,
  SerializedAttendance,
  SerializedPayroll,
  SerializedRole,
} from "@/features/staff/staff-view";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export const dynamic = "force-dynamic";

async function StaffDataLoader() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";

  const [rawStaff, rawAttendance, rawPayroll, roles] = await Promise.all([
    getStaffList(defaultShopId),
    getAttendanceList(defaultShopId),
    getPayrollList(defaultShopId),
    prisma.role.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  const staffList: SerializedStaffMember[] = rawStaff.map((s: any) => {
    const membership = s.user.memberships.find((m: any) => m.shopId === defaultShopId);
    return {
      id: s.id,
      employeeCode: s.employeeCode,
      fullName: s.user.fullName || "Unnamed Staff",
      phone: s.user.phone || "",
      email: s.user.email,
      designation: s.designation,
      department: s.department,
      roleName: membership?.role.name || "STAFF",
      roleId: membership?.roleId || "",
      compensationType: s.compensationType,
      baseSalary: Number(s.baseSalary),
      commissionRate: Number(s.commissionRate),
      isActive: s.isActive,
      joiningDate: s.joiningDate.toISOString(),
    };
  });

  const attendanceList: SerializedAttendance[] = rawAttendance.map((a: any) => {
    const matchedStaff = rawStaff.find((s: any) => s.id === a.staffProfileId);
    return {
      id: a.id,
      staffProfileId: a.staffProfileId,
      staffName: matchedStaff?.user.fullName || matchedStaff?.employeeCode || "Staff",
      employeeCode: matchedStaff?.employeeCode || "",
      date: a.date.toISOString(),
      status: a.status as "PRESENT" | "ABSENT" | "LATE" | "LEAVE",
      checkInTime: a.checkInTime ? a.checkInTime.toISOString() : null,
      checkOutTime: a.checkOutTime ? a.checkOutTime.toISOString() : null,
      notes: a.notes,
    };
  });

  const payrollList: SerializedPayroll[] = rawPayroll.map((p: any) => ({
    id: p.id,
    staffName: p.staffProfile.user.fullName || p.staffProfile.employeeCode,
    employeeCode: p.staffProfile.employeeCode,
    payrollMonth: p.payrollMonth,
    baseSalary: Number(p.baseSalary),
    commissionAmount: Number(p.commissionAmount),
    deductions: Number(p.deductions),
    netAmount: Number(p.netAmount),
    paymentMethod: p.paymentMethod,
    paidDate: p.paidDate.toISOString(),
    paidByName: p.paidBy.fullName || "Admin",
    journalEntryId: p.journalEntryId,
    notes: p.notes,
  }));

  const serializedRoles: SerializedRole[] = roles.map((r: any) => ({
    id: r.id,
    name: r.name,
    description: r.description,
  }));

  return (
    <StaffView
      shopId={defaultShopId}
      staffList={staffList}
      attendanceList={attendanceList}
      payrollList={payrollList}
      roles={serializedRoles}
    />
  );
}

export default function StaffPage() {
  return (
    <Suspense
      fallback={
        <PageSkeleton
          title="স্টাফ ও কর্মচারী ব্যবস্থাপনা"
          subtitle="কর্মচারী তালিকা, উপস্থিতি ও পে-রোল লোড হচ্ছে..."
          cardsCount={3}
          showFilter={true}
          rowsCount={6}
        />
      }
    >
      <StaffDataLoader />
    </Suspense>
  );
}
