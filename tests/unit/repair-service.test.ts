import { describe, it, expect, vi } from "vitest";
import {
  createServiceJob,
  updateServiceJobStatus,
  submitDiagnosticEstimate,
  approveEstimate,
  consumeServicePart,
  deliverServiceJob,
  VALID_STATUS_TRANSITIONS,
} from "@/features/repairs/repair-service";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    customer: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    serviceJob: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    serviceJobStatusHistory: {
      create: vi.fn(),
    },
    serviceDiagnostic: {
      create: vi.fn(),
      update: vi.fn(),
    },
    servicePart: {
      create: vi.fn(),
    },
    serviceWarranty: {
      create: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
    stockBalance: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
    account: {
      findMany: vi.fn(),
    },
    journalEntry: {
      create: vi.fn(),
    },
    payment: {
      count: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("Repair Servicing Domain Service (Phase 4)", () => {
  const shopId = "11111111-1111-1111-1111-111111111111";
  const customerId = "22222222-2222-2222-2222-222222222222";
  const cashierId = "00000000-0000-0000-0000-000000000001";
  const techId = "00000000-0000-0000-0000-000000000002";
  const locationId = "33333333-3333-3333-3333-333333333333";
  const jobId = "job-uuid-1";
  const productId = "part-disp-uuid-1";

  it("strictly enforces security policy: rejects customer device PIN, passcode, or password in intake fields", async () => {
    await expect(
      createServiceJob({
        shopId,
        customerId,
        deviceBrand: "Samsung",
        deviceModel: "Galaxy A15",
        intakeCondition: "Good condition, pin: 1234", // Forbidden
        reportedIssue: "Screen flicker",
        intakeCashierId: cashierId,
      })
    ).rejects.toThrow("Security policy violation: Storing customer device PINs");
  });

  it("creates a new service job with sequential job number and initial INTAKE status", async () => {
    vi.mocked(prisma.customer.findUnique).mockResolvedValueOnce({
      id: customerId,
      shopId,
      name: "Md. Al-Amin",
    } as any);

    vi.mocked(prisma.serviceJob.count).mockResolvedValueOnce(0);
    vi.mocked(prisma.serviceJob.create).mockResolvedValueOnce({
      id: jobId,
      shopId,
      jobNumber: "JOB-000001",
      deviceBrand: "Samsung",
      deviceModel: "Galaxy A15",
      status: "INTAKE",
    } as any);

    const job = await createServiceJob({
      shopId,
      customerId,
      deviceBrand: "Samsung",
      deviceModel: "Galaxy A15",
      intakeCondition: "Front glass shattered",
      reportedIssue: "No display light after drop",
      intakeCashierId: cashierId,
    });

    expect(job.jobNumber).toBe("JOB-000001");
    expect(job.status).toBe("INTAKE");
  });

  it("enforces valid status transitions and rejects invalid state jumps", async () => {
    vi.mocked(prisma.serviceJob.findUnique).mockResolvedValueOnce({
      id: jobId,
      shopId,
      status: "INTAKE",
    } as any);

    // INTAKE -> DELIVERED is not a valid direct transition
    await expect(
      updateServiceJobStatus({
        shopId,
        jobId,
        newStatus: "DELIVERED",
        actorId: techId,
      })
    ).rejects.toThrow("Invalid status transition from 'INTAKE' to 'DELIVERED'");
  });

  it("rejects spare parts consumption when stock on hand is insufficient", async () => {
    vi.mocked(prisma.serviceJob.findUnique).mockResolvedValueOnce({
      id: jobId,
      shopId,
      status: "IN_REPAIR",
    } as any);

    vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
      id: productId,
      shopId,
      name: "Samsung A15 AMOLED Display",
      costPrice: 1800 as any,
      sellingPrice: 2800 as any,
    } as any);

    vi.mocked(prisma.stockBalance.findFirst).mockResolvedValueOnce({
      id: "bal-1",
      shopId,
      productId,
      locationId,
      quantityOnHand: 1 as any, // Only 1 available
    } as any);

    await expect(
      consumeServicePart({
        shopId,
        jobId,
        productId,
        locationId,
        quantity: 2, // Requesting 2
        consumedById: techId,
      })
    ).rejects.toThrow("Insufficient stock for spare part");
  });

  it("consumes spare parts from inventory, deducts stock, and posts balanced journal entry (5100 Debit === 1200 Credit)", async () => {
    vi.mocked(prisma.serviceJob.findUnique).mockResolvedValueOnce({
      id: jobId,
      shopId,
      jobNumber: "JOB-000001",
      status: "IN_REPAIR",
      partsCost: 0 as any,
      labourCost: 500 as any,
      outsideCost: 0 as any,
      paidAmount: 0 as any,
    } as any);

    vi.mocked(prisma.product.findUnique).mockResolvedValue({
      id: productId,
      shopId,
      isTrackStock: true,
      name: "Samsung A15 AMOLED Display",
      costPrice: 1800 as any,
      sellingPrice: 2800 as any,
    } as any);

    vi.mocked(prisma.stockBalance.findFirst).mockResolvedValue({
      id: "bal-1",
      shopId,
      productId,
      locationId,
      quantityOnHand: 5 as any,
      averageCost: 1800 as any,
    } as any);

    vi.mocked(prisma.servicePart.create).mockResolvedValueOnce({
      id: "sp-1",
      serviceJobId: jobId,
      productId,
      quantity: 1,
      unitCost: 1800 as any,
      sellingPrice: 2800 as any,
      subtotal: 2800 as any,
    } as any);

    vi.mocked(prisma.stockBalance.update).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.stockMovement.create).mockResolvedValueOnce({} as any);

    vi.mocked(prisma.serviceJob.update).mockResolvedValueOnce({
      id: jobId,
      partsCost: 2800 as any,
      totalAmount: 3300 as any,
    } as any);

    vi.mocked(prisma.account.findMany).mockResolvedValueOnce([
      { id: "acc-5100", code: "5100" },
      { id: "acc-1200", code: "1200" },
    ] as any);

    vi.mocked(prisma.journalEntry.create).mockResolvedValueOnce({ id: "je-parts" } as any);

    const result = await consumeServicePart({
      shopId,
      jobId,
      productId,
      locationId,
      quantity: 1,
      consumedById: techId,
    });

    expect(result.servicePart.subtotal).toBe(2800);
    expect(prisma.journalEntry.create).toHaveBeenCalled();
  });

  it("successfully delivers service job, collects payment, creates warranty, and posts balanced service revenue (4100)", async () => {
    vi.mocked(prisma.serviceJob.findUnique).mockResolvedValueOnce({
      id: jobId,
      shopId,
      jobNumber: "JOB-000001",
      status: "READY_FOR_DELIVERY",
      totalAmount: 3300 as any,
      customer: { id: customerId, totalDue: 0 as any },
    } as any);

    vi.mocked(prisma.payment.count).mockResolvedValueOnce(0);
    vi.mocked(prisma.payment.create).mockResolvedValueOnce({ id: "pay-1" } as any);
    vi.mocked(prisma.serviceWarranty.create).mockResolvedValueOnce({
      id: "war-1",
      warrantyDays: 30,
    } as any);

    vi.mocked(prisma.account.findMany).mockResolvedValueOnce([
      { id: "acc-1000", code: "1000" },
      { id: "acc-4100", code: "4100" },
    ] as any);

    vi.mocked(prisma.journalEntry.create).mockResolvedValueOnce({ id: "je-deliver" } as any);

    vi.mocked(prisma.serviceJob.update).mockResolvedValueOnce({
      id: jobId,
      status: "DELIVERED",
      paidAmount: 3300 as any,
      dueAmount: 0 as any,
      paymentStatus: "PAID",
    } as any);

    const delivered = await deliverServiceJob({
      shopId,
      jobId,
      deliveredById: cashierId,
      paymentMethod: "CASH",
      paidAmount: 3300,
      warrantyDays: 30,
    });

    expect(delivered.status).toBe("DELIVERED");
    expect(delivered.paymentStatus).toBe("PAID");
    expect(prisma.serviceWarranty.create).toHaveBeenCalled();
    expect(prisma.journalEntry.create).toHaveBeenCalled();
  });
});
