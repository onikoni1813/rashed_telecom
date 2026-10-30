import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getStaff, POST as createStaff } from "@/app/api/v1/staff/route";
import { GET as getPayroll, POST as disbursePayroll } from "@/app/api/v1/staff/payroll/route";
import { GET as getApprovals, POST as createApproval } from "@/app/api/v1/approvals/route";
import { POST as reviewApproval } from "@/app/api/v1/approvals/[id]/review/route";
import { GET as getCustomerStatementRoute } from "@/app/api/v1/statements/customer/route";
import { GET as searchAuditLogsRoute } from "@/app/api/v1/operations/audit-search/route";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    shopMember: {
      findUnique: vi.fn(),
    },
    staffProfile: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    membership: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    attendanceRecord: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    payrollPayment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    approvalRequest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
    },
    sale: {
      findMany: vi.fn(),
    },
    payment: {
      findMany: vi.fn(),
    },
    salesReturn: {
      findMany: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    idempotencyKey: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/features/sales/accounting-posting", () => ({
  postJournalEntry: vi.fn().mockResolvedValue({ id: "journal-entry-123" }),
}));

describe("Staff, Payroll, Approvals & Operations API Integration", () => {
  const shopId = "11111111-1111-1111-1111-111111111111";
  const ownerId = "00000000-0000-0000-0000-000000000001";
  const cashierId = "00000000-0000-0000-0000-000000000002";
  const customerId = "22222222-2222-2222-2222-222222222222";

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: OWNER has full access
    (prisma.shopMember.findUnique as any).mockImplementation(({ where }: any) => {
      const uId = where?.shopId_userId?.userId || where?.userId_shopId?.userId;
      if (uId === ownerId) {
        return Promise.resolve({
          id: "member-owner",
          shopId,
          userId: ownerId,
          isActive: true,
          role: {
            name: "OWNER",
            rolePermissions: [],
          },
        });
      }
      if (uId === cashierId) {
        return Promise.resolve({
          id: "member-cashier",
          shopId,
          userId: cashierId,
          isActive: true,
          role: {
            name: "CASHIER",
            rolePermissions: [
              { permission: { key: "sales.create" } },
              { permission: { key: "sales.view" } },
              { permission: { key: "approvals.view" } },
              { permission: { key: "dashboard.view" } },
            ],
          },
        });
      }
      return Promise.resolve(null);
    });

    (prisma.idempotencyKey.findUnique as any).mockResolvedValue(null);
    (prisma.idempotencyKey.upsert as any).mockResolvedValue({} as any);
    (prisma.idempotencyKey.update as any).mockResolvedValue({} as any);
  });

  describe("GET /api/v1/staff", () => {
    it("returns list of staff profiles", async () => {
      (prisma.staffProfile.findMany as any).mockResolvedValue([
        {
          id: "staff-1",
          employeeCode: "EMP-001",
          designation: "Manager",
          baseSalary: 25000 as any,
          user: {
            id: ownerId,
            fullName: "Rashed Sarkar",
            phone: "01521378476",
            email: "rashedsarkarofficial@gmail.com",
            memberships: [],
          },
          attendanceRecords: [],
          payrollPayments: [],
        },
      ]);

      const req = new Request(`http://localhost/api/v1/staff?shopId=${shopId}`, {
        headers: { "x-test-user-id": ownerId },
      });

      const res = await getStaff(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].employeeCode).toBe("EMP-001");
    });
  });

  describe("Payroll Security Guards - GET /api/v1/staff/payroll", () => {
    it("strictly blocks unauthorized role (CASHIER without payroll.view) with 403 Forbidden", async () => {
      const req = new Request(`http://localhost/api/v1/staff/payroll?shopId=${shopId}`, {
        headers: { "x-test-user-id": cashierId },
      });

      const res = await getPayroll(req);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.error?.code).toBe("FORBIDDEN");
    });

    it("allows authorized OWNER to view payroll records", async () => {
      (prisma.payrollPayment.findMany as any).mockResolvedValue([
        {
          id: "pay-1",
          payrollMonth: "2026-10",
          netAmount: 25000 as any,
          staffProfile: {
            employeeCode: "EMP-001",
            user: { fullName: "Tanvir Ahmed" },
          },
          paidBy: { fullName: "Rashed Sarkar" },
        },
      ]);

      const req = new Request(`http://localhost/api/v1/staff/payroll?shopId=${shopId}`, {
        headers: { "x-test-user-id": ownerId },
      });

      const res = await getPayroll(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].payrollMonth).toBe("2026-10");
    });
  });

  describe("Maker-Checker Approvals - POST /api/v1/approvals and Review", () => {
    it("creates an approval request", async () => {
      (prisma.approvalRequest.create as any).mockResolvedValue({
        id: "req-1",
        shopId,
        requestType: "STOCK_ADJUSTMENT",
        status: "PENDING",
        requestedById: cashierId,
        requestedBy: { id: cashierId, fullName: "Cashier Tanvir" },
      });

      const req = new Request("http://localhost/api/v1/approvals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": cashierId,
        },
        body: JSON.stringify({
          shopId,
          requestType: "STOCK_ADJUSTMENT",
          referenceId: "ADJ-001",
          details: { reason: "Battery broken", amount: 1200 },
        }),
      });

      const res = await createApproval(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.data.id).toBe("req-1");
      expect(body.data.status).toBe("PENDING");
    });

    it("blocks SELF-APPROVAL with 403 Forbidden when reviewer is the maker", async () => {
      (prisma.approvalRequest.findUnique as any).mockResolvedValue({
        id: "req-1",
        shopId,
        requestedById: ownerId, // Maker is owner
        status: "PENDING",
      });

      const req = new Request("http://localhost/api/v1/approvals/req-1/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": ownerId, // Owner attempting to self-approve!
        },
        body: JSON.stringify({
          shopId,
          decision: "APPROVED",
          reviewReason: "Self-approving my own request",
        }),
      });

      const res = await reviewApproval(req, {
        params: Promise.resolve({ id: "req-1" }),
      });
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.error?.message).toContain("Maker-Checker Violation: Self-approval is strictly forbidden");
    });

    it("allows another authorized staff member to approve the request", async () => {
      (prisma.approvalRequest.findUnique as any).mockResolvedValue({
        id: "req-1",
        shopId,
        requestedById: cashierId, // Maker is cashier
        status: "PENDING",
      });

      (prisma.approvalRequest.update as any).mockResolvedValue({
        id: "req-1",
        shopId,
        status: "APPROVED",
        reviewedById: ownerId,
        reviewedAt: new Date(),
        reviewReason: "Verified battery loss with supplier",
        requestedBy: { id: cashierId, fullName: "Cashier Tanvir" },
        reviewedBy: { id: ownerId, fullName: "Rashed Sarkar" },
      });

      const req = new Request("http://localhost/api/v1/approvals/req-1/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-user-id": ownerId, // Owner is different from cashier
        },
        body: JSON.stringify({
          shopId,
          decision: "APPROVED",
          reviewReason: "Verified battery loss with supplier",
        }),
      });

      const res = await reviewApproval(req, {
        params: Promise.resolve({ id: "req-1" }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.status).toBe("APPROVED");
      expect(body.data.reviewedById).toBe(ownerId);
    });
  });

  describe("Customer Running Balance Statement - GET /api/v1/statements/customer", () => {
    it("calculates accurate chronological debits, credits, and closing balance", async () => {
      (prisma.customer.findUnique as any).mockResolvedValue({
        id: customerId,
        shopId,
        name: "Abdur Rahim",
        phone: "01711000111",
        address: "Kaliganj",
        totalDue: 2000 as any,
      });

      (prisma.sale.findMany as any).mockResolvedValue([
        {
          id: "sale-1",
          invoiceNumber: "INV-001",
          totalAmount: 5000 as any,
          paymentStatus: "PARTIAL",
          createdAt: new Date("2026-10-01T10:00:00Z"),
        },
      ]);

      (prisma.payment.findMany as any).mockResolvedValue([
        {
          id: "pay-1",
          paymentNumber: "PAY-001",
          amount: 3000 as any,
          paymentMethod: "CASH",
          referenceNumber: null,
          createdAt: new Date("2026-10-02T10:00:00Z"),
        },
      ]);

      (prisma.salesReturn.findMany as any).mockResolvedValue([]);

      const req = new Request(
        `http://localhost/api/v1/statements/customer?shopId=${shopId}&customerId=${customerId}`,
        {
          headers: { "x-test-user-id": ownerId },
        }
      );

      const res = await getCustomerStatementRoute(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.customer.name).toBe("Abdur Rahim");
      expect(body.data.totalBilled).toBe(5000);
      expect(body.data.totalPaid).toBe(3000);
      expect(body.data.closingBalance).toBe(2000);
      expect(body.data.lines).toHaveLength(2);
      expect(body.data.lines[0].runningBalance).toBe(5000); // After invoice
      expect(body.data.lines[1].runningBalance).toBe(2000); // After payment
    });
  });

  describe("Audit Log Search - GET /api/v1/operations/audit-search", () => {
    it("returns filtered audit logs", async () => {
      (prisma.auditLog.findMany as any).mockResolvedValue([
        {
          id: "log-1",
          shopId,
          action: "staff.create",
          entityType: "StaffProfile",
          entityId: "staff-1",
          reason: "Created staff profile",
          createdAt: new Date(),
          actor: { id: ownerId, fullName: "Rashed Sarkar", email: "rashedsarkarofficial@gmail.com" },
        },
      ]);
      (prisma.auditLog.count as any).mockResolvedValue(1);

      const req = new Request(
        `http://localhost/api/v1/operations/audit-search?shopId=${shopId}&entityType=StaffProfile`,
        {
          headers: { "x-test-user-id": ownerId },
        }
      );

      const res = await searchAuditLogsRoute(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.logs).toHaveLength(1);
      expect(body.data.logs[0].action).toBe("staff.create");
    });
  });
});
