import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createStaffProfile,
  recordAttendance,
  processPayroll,
  getStaffList,
  getAttendanceList,
  getPayrollList,
} from "@/features/staff/staff-service";
import { ValidationError, NotFoundError, ConflictError } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    staffProfile: {
      count: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    shopMember: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    attendanceRecord: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    payrollPayment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/features/sales/accounting-posting", () => ({
  postJournalEntry: vi.fn().mockResolvedValue({ id: "journal-entry-123" }),
}));

describe("Staff & Operations Domain Service - Staff & Payroll", () => {
  const shopId = "11111111-1111-1111-1111-111111111111";
  const actorId = "00000000-0000-0000-0000-000000000001";
  const roleId = "role-technician-uuid";

  beforeEach(async () => {
    vi.resetAllMocks();
    const { postJournalEntry } = await import("@/features/sales/accounting-posting");
    vi.mocked(postJournalEntry).mockResolvedValue({ id: "journal-entry-123" } as any);
  });

  describe("createStaffProfile", () => {
    it("throws ValidationError when base salary is negative", async () => {
      await expect(
        createStaffProfile({
          shopId,
          fullName: "Tanvir Ahmed",
          phone: "01711223344",
          roleId,
          baseSalary: -500,
          actorId,
        })
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when phone number is too short or invalid", async () => {
      await expect(
        createStaffProfile({
          shopId,
          fullName: "Tanvir Ahmed",
          phone: "123",
          roleId,
          baseSalary: 15000,
          actorId,
        })
      ).rejects.toThrow(ValidationError);
    });

    it("throws ConflictError when employee code already exists", async () => {
      vi.mocked(prisma.staffProfile.findUnique).mockResolvedValueOnce({
        id: "existing-profile-id",
      } as any);

      await expect(
        createStaffProfile({
          shopId,
          fullName: "Tanvir Ahmed",
          phone: "01711223344",
          roleId,
          employeeCode: "EMP-001",
          baseSalary: 15000,
          actorId,
        })
      ).rejects.toThrow(ConflictError);
    });

    it("successfully creates user, membership and staff profile with audit log", async () => {
      vi.mocked(prisma.staffProfile.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);
      vi.mocked(prisma.user.create).mockResolvedValueOnce({
        id: "new-user-id",
        fullName: "Tanvir Ahmed",
        phone: "01711223344",
        email: "tanvir@rashedtelecom.com",
      } as any);
      vi.mocked(prisma.shopMember.upsert).mockResolvedValueOnce({
        id: "mem-1",
      } as any);
      vi.mocked(prisma.staffProfile.create).mockResolvedValueOnce({
        id: "profile-1",
        shopId,
        userId: "new-user-id",
        employeeCode: "EMP-001",
        baseSalary: 15000,
      } as any);

      const result = await createStaffProfile({
        shopId,
        fullName: "Tanvir Ahmed",
        email: "tanvir@rashedtelecom.com",
        phone: "01711223344",
        roleId,
        employeeCode: "EMP-001",
        designation: "Senior Technician",
        baseSalary: 15000,
        commissionRate: 5,
        actorId,
      });

      expect(result.id).toBe("profile-1");
      expect(prisma.staffProfile.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "staff.create",
            entityType: "StaffProfile",
          }),
        })
      );
    });
  });

  describe("recordAttendance", () => {
    it("throws NotFoundError when staff profile does not exist", async () => {
      vi.mocked(prisma.staffProfile.findUnique).mockResolvedValueOnce(null);

      await expect(
        recordAttendance({
          shopId,
          staffProfileId: "non-existent-id",
          date: new Date(),
          status: "PRESENT",
          actorId,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it("successfully upserts attendance record", async () => {
      vi.mocked(prisma.staffProfile.findUnique).mockResolvedValueOnce({
        id: "staff-1",
        shopId,
        employeeCode: "EMP-001",
        user: { fullName: "Tanvir Ahmed" },
      } as any);

      vi.mocked(prisma.attendanceRecord.upsert).mockResolvedValueOnce({
        id: "att-1",
        shopId,
        staffProfileId: "staff-1",
        status: "PRESENT",
      } as any);

      const result = await recordAttendance({
        shopId,
        staffProfileId: "staff-1",
        date: new Date("2026-10-24T00:00:00Z"),
        status: "PRESENT",
        actorId,
      });

      expect(result.id).toBe("att-1");
      expect(prisma.attendanceRecord.upsert).toHaveBeenCalled();
    });
  });

  describe("processPayroll", () => {
    it("throws NotFoundError when staff profile does not exist", async () => {
      vi.mocked(prisma.staffProfile.findUnique).mockResolvedValueOnce(null);

      await expect(
        processPayroll({
          shopId,
          staffProfileId: "non-existent-id",
          payrollMonth: "2026-10",
          baseSalary: 15000,
          paymentMethod: "CASH",
          paidById: actorId,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ConflictError when salary already paid for the month", async () => {
      vi.mocked(prisma.staffProfile.findUnique).mockResolvedValueOnce({
        id: "staff-1",
        shopId,
        employeeCode: "EMP-001",
        user: { fullName: "Tanvir Ahmed" },
      } as any);

      vi.mocked(prisma.payrollPayment.findUnique).mockResolvedValueOnce({
        id: "pay-prev",
      } as any);

      await expect(
        processPayroll({
          shopId,
          staffProfileId: "staff-1",
          payrollMonth: "2026-10",
          baseSalary: 15000,
          paymentMethod: "CASH",
          paidById: actorId,
        })
      ).rejects.toThrow(ConflictError);
    });

    it("throws ValidationError when net amount is negative", async () => {
      vi.mocked(prisma.staffProfile.findUnique).mockResolvedValueOnce({
        id: "staff-1",
        shopId,
        employeeCode: "EMP-001",
        user: { fullName: "Tanvir Ahmed" },
      } as any);
      vi.mocked(prisma.payrollPayment.findUnique).mockResolvedValueOnce(null);

      await expect(
        processPayroll({
          shopId,
          staffProfileId: "staff-1",
          payrollMonth: "2026-10",
          baseSalary: 1000,
          deductions: 5000, // net = -4000
          paymentMethod: "CASH",
          paidById: actorId,
        })
      ).rejects.toThrow(ValidationError);
    });

    it("successfully creates payroll record and posts balanced double-entry journal", async () => {
      vi.mocked(prisma.staffProfile.findUnique).mockResolvedValueOnce({
        id: "staff-1",
        shopId,
        employeeCode: "EMP-001",
        user: { fullName: "Tanvir Ahmed" },
      } as any);
      vi.mocked(prisma.payrollPayment.findUnique).mockResolvedValueOnce(null);

      vi.mocked(prisma.payrollPayment.create).mockResolvedValueOnce({
        id: "pay-1",
        shopId,
        staffProfileId: "staff-1",
        payrollMonth: "2026-10",
        baseSalary: 15000,
        commissionAmount: 2000,
        deductions: 500,
        netAmount: 16500,
        paymentMethod: "CASH",
      } as any);

      const { postJournalEntry } = await import("@/features/sales/accounting-posting");

      const result = await processPayroll({
        shopId,
        staffProfileId: "staff-1",
        payrollMonth: "2026-10",
        baseSalary: 15000,
        commissionAmount: 2000,
        deductions: 500,
        paymentMethod: "CASH",
        paidById: actorId,
      });

      expect(result.payroll.id).toBe("pay-1");
      expect(postJournalEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          shopId,
          lines: expect.arrayContaining([
            expect.objectContaining({ accountCode: "6100", debit: 16500 }),
            expect.objectContaining({ accountCode: "1000", credit: 16500 }),
          ]),
        }),
        expect.anything()
      );
      expect(prisma.payrollPayment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "pay-1" },
          data: { journalEntryId: "journal-entry-123" },
        })
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "salary.disburse",
          }),
        })
      );
    });
  });
});
