import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ValidationError, NotFoundError, ConflictError } from "@/lib/errors";
import { postJournalEntry } from "@/features/sales/accounting-posting";
import { recordAuditLog } from "@/lib/audit/service";

// ==============================================================================
// 1. STAFF PROFILES
// ==============================================================================

export interface CreateStaffProfileInput {
  shopId: string;
  fullName: string;
  email?: string | null;
  phone: string;
  roleId: string;
  employeeCode?: string;
  designation?: string;
  department?: string;
  joiningDate?: Date;
  compensationType?: "SALARY" | "COMMISSION" | "SALARY_PLUS_COMMISSION";
  baseSalary: number;
  commissionRate?: number;
  actorId: string;
}

export async function createStaffProfile(input: CreateStaffProfileInput) {
  if (input.baseSalary < 0) {
    throw new ValidationError("Base salary cannot be negative.");
  }
  if (!input.phone || input.phone.trim().length < 10) {
    throw new ValidationError("A valid phone number is required for staff members.");
  }

  return await prisma.$transaction(async (tx: any) => {
    // 1. Generate or verify Employee Code
    let employeeCode = input.employeeCode;
    if (!employeeCode) {
      const count = await tx.staffProfile.count({ where: { shopId: input.shopId } });
      employeeCode = `EMP-${String(count + 1).padStart(3, "0")}`;
    }

    const existingCode = await tx.staffProfile.findUnique({
      where: {
        shopId_employeeCode: {
          shopId: input.shopId,
          employeeCode,
        },
      },
    });

    if (existingCode) {
      throw new ConflictError(`Employee code '${employeeCode}' is already in use.`);
    }

    // 2. Find or create User
    let user = await tx.user.findFirst({
      where: {
        OR: [
          { phone: input.phone },
          ...(input.email ? [{ email: input.email }] : []),
        ],
      },
    });

    if (!user) {
      user = await tx.user.create({
        data: {
          fullName: input.fullName,
          phone: input.phone,
          email: input.email || null,
          isActive: true,
        },
      });
    }

    // 3. Ensure Shop Membership
    await tx.shopMember.upsert({
      where: {
        shopId_userId: {
          shopId: input.shopId,
          userId: user.id,
        },
      },
      update: {
        roleId: input.roleId,
        isActive: true,
      },
      create: {
        shopId: input.shopId,
        userId: user.id,
        roleId: input.roleId,
        isActive: true,
      },
    });

    // 4. Create Staff Profile
    const profile = await tx.staffProfile.create({
      data: {
        shopId: input.shopId,
        userId: user.id,
        employeeCode,
        designation: input.designation || "Staff",
        department: input.department || "General",
        joiningDate: input.joiningDate || new Date(),
        compensationType: input.compensationType || "SALARY",
        baseSalary: input.baseSalary,
        commissionRate: input.commissionRate || 0,
        isActive: true,
      },
      include: {
        user: true,
      },
    });

    // 5. Audit Log
    await recordAuditLog({
      shopId: input.shopId,
      actorId: input.actorId,
      action: "staff.create",
      entityType: "StaffProfile",
      entityId: profile.id,
      reason: `Created staff profile for ${input.fullName} (${employeeCode})`,
      afterState: {
        employeeCode,
        designation: input.designation,
        baseSalary: input.baseSalary,
      },
    });

    return profile;
  });
}

export async function getStaffList(shopId: string) {
  return await prisma.staffProfile.findMany({
    where: { shopId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          memberships: {
            where: { shopId },
            include: { role: true },
          },
        },
      },
      attendanceRecords: {
        take: 5,
        orderBy: { date: "desc" },
      },
      payrollPayments: {
        take: 3,
        orderBy: { paidDate: "desc" },
      },
    },
    orderBy: { employeeCode: "asc" },
  });
}

// ==============================================================================
// 2. ATTENDANCE TRACKING
// ==============================================================================

export interface RecordAttendanceInput {
  shopId: string;
  staffProfileId: string;
  date: Date;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
  checkInTime?: Date | null;
  checkOutTime?: Date | null;
  notes?: string | null;
  actorId: string;
}

export async function recordAttendance(input: RecordAttendanceInput) {
  const staff = await prisma.staffProfile.findUnique({
    where: { id: input.staffProfileId },
    include: { user: true },
  });

  if (!staff || staff.shopId !== input.shopId) {
    throw new NotFoundError("Staff profile not found.");
  }

  // Normalize date to YYYY-MM-DD
  const dateNorm = new Date(input.date);
  dateNorm.setHours(0, 0, 0, 0);

  const record = await prisma.attendanceRecord.upsert({
    where: {
      shopId_staffProfileId_date: {
        shopId: input.shopId,
        staffProfileId: staff.id,
        date: dateNorm,
      },
    },
    update: {
      status: input.status,
      checkInTime: input.checkInTime || undefined,
      checkOutTime: input.checkOutTime || undefined,
      notes: input.notes || undefined,
    },
    create: {
      shopId: input.shopId,
      staffProfileId: staff.id,
      date: dateNorm,
      status: input.status,
      checkInTime: input.checkInTime || new Date(),
      checkOutTime: input.checkOutTime || null,
      notes: input.notes || null,
    },
  });

  await recordAuditLog({
    shopId: input.shopId,
    actorId: input.actorId,
    action: "attendance.record",
    entityType: "AttendanceRecord",
    entityId: record.id,
    reason: `Recorded attendance for ${staff.user.fullName || staff.employeeCode}: ${input.status}`,
    afterState: { status: input.status, date: dateNorm.toISOString() },
  });

  return record;
}

export async function getAttendanceList(shopId: string, targetDate?: Date) {
  const queryDate = targetDate ? new Date(targetDate) : new Date();
  queryDate.setHours(0, 0, 0, 0);

  return await prisma.attendanceRecord.findMany({
    where: {
      shopId,
      date: queryDate,
    },
    include: {
      staffProfile: {
        include: { user: true },
      },
    },
    orderBy: { staffProfile: { employeeCode: "asc" } },
  });
}

// ==============================================================================
// 3. PAYROLL & SALARY PROCESSING
// Strict Rule: Disbursing salary posts balanced entry to Account 6100 (Salaries)
// ==============================================================================

export interface ProcessPayrollInput {
  shopId: string;
  staffProfileId: string;
  payrollMonth: string; // e.g. "2026-10"
  baseSalary?: number;
  commissionAmount?: number;
  deductions?: number;
  paymentMethod: "CASH" | "BANK" | "BKASH" | "NAGAD";
  notes?: string | null;
  paidById: string;
}

export async function processPayroll(input: ProcessPayrollInput) {
  return await prisma.$transaction(async (tx: any) => {
    // 1. Verify Staff Profile
    const staff = await tx.staffProfile.findUnique({
      where: { id: input.staffProfileId },
      include: { user: true },
    });

    if (!staff || staff.shopId !== input.shopId) {
      throw new NotFoundError("Staff profile not found.");
    }

    // 2. Check if already paid for this month
    const existingPayment = await tx.payrollPayment.findUnique({
      where: {
        shopId_staffProfileId_payrollMonth: {
          shopId: input.shopId,
          staffProfileId: staff.id,
          payrollMonth: input.payrollMonth,
        },
      },
    });

    if (existingPayment) {
      throw new ConflictError(
        `Salary for ${staff.user.fullName || staff.employeeCode} has already been disbursed for ${input.payrollMonth}.`
      );
    }

    // 3. Compute Net Amount
    const base = input.baseSalary !== undefined ? input.baseSalary : Number(staff.baseSalary);
    const commission = Number(input.commissionAmount || 0);
    const deductions = Number(input.deductions || 0);

    const netAmount = base + commission - deductions;
    if (netAmount <= 0) {
      throw new ValidationError("Net salary payable must be greater than zero.");
    }

    // 4. Create Payroll Payment
    const paymentAccountCode = input.paymentMethod === "CASH" ? "1000" : "1010";

    const payroll = await tx.payrollPayment.create({
      data: {
        shopId: input.shopId,
        staffProfileId: staff.id,
        payrollMonth: input.payrollMonth,
        baseSalary: base,
        commissionAmount: commission,
        deductions: deductions,
        netAmount: netAmount,
        paymentMethod: input.paymentMethod,
        paidDate: new Date(),
        paidById: input.paidById,
        notes: input.notes || null,
      },
    });

    // 5. Post Balanced Double-Entry Journal
    // Debit: Salaries & Commissions (6100)
    // Credit: Cash on Hand (1000) or Bank/MFS (1010)
    const journalEntry = await postJournalEntry(
      {
        shopId: input.shopId,
        sourceType: "EXPENSE",
        sourceId: payroll.id,
        description: `Salary Disbursed for ${staff.user.fullName || staff.employeeCode} (${input.payrollMonth})`,
        lines: [
          {
            accountCode: "6100", // Salaries & Commissions Expense
            debit: netAmount,
            description: `Salary & Commission for ${staff.employeeCode}`,
          },
          {
            accountCode: paymentAccountCode,
            credit: netAmount,
            description: `Disbursed via ${input.paymentMethod}`,
          },
        ],
      },
      tx
    );

    // Link Journal Entry
    await tx.payrollPayment.update({
      where: { id: payroll.id },
      data: { journalEntryId: journalEntry.id },
    });

    // 6. Audit Log
    await recordAuditLog({
      shopId: input.shopId,
      actorId: input.paidById,
      action: "salary.disburse",
      entityType: "PayrollPayment",
      entityId: payroll.id,
      reason: `Disbursed salary ৳${netAmount} to ${staff.user.fullName || staff.employeeCode} for ${input.payrollMonth}`,
      afterState: {
        employeeCode: staff.employeeCode,
        payrollMonth: input.payrollMonth,
        netAmount,
        paymentMethod: input.paymentMethod,
      },
    });

    return { payroll, journalEntry };
  });
}

export async function getPayrollList(shopId: string, month?: string) {
  return await prisma.payrollPayment.findMany({
    where: {
      shopId,
      ...(month ? { payrollMonth: month } : {}),
    },
    include: {
      staffProfile: {
        include: { user: true },
      },
      paidBy: {
        select: { id: true, fullName: true, email: true },
      },
      journalEntry: true,
    },
    orderBy: { paidDate: "desc" },
  });
}
