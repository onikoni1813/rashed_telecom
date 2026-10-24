import { describe, it, expect, vi } from "vitest";
import { GET as getServiceJobs, POST as postServiceJob } from "@/app/api/v1/service-jobs/route";
import { PATCH as patchServiceJob } from "@/app/api/v1/service-jobs/[id]/route";
import { POST as approveEstimateRoute } from "@/app/api/v1/service-jobs/[id]/approve-estimate/route";
import { POST as consumePartsRoute } from "@/app/api/v1/service-jobs/[id]/consume-parts/route";
import { POST as deliverRoute } from "@/app/api/v1/service-jobs/[id]/deliver/route";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    shopMember: {
      findUnique: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    serviceJob: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
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
    idempotencyKey: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("Repair Servicing API Integration (Phase 4)", () => {
  const shopId = "11111111-1111-1111-1111-111111111111";
  const userId = "00000000-0000-0000-0000-000000000001";
  const customerId = "22222222-2222-2222-2222-222222222222";
  const jobId = "job-uuid-100";
  const productId = "part-uuid-100";
  const locationId = "loc-uuid-100";

  it("creates a service intake job via POST /api/v1/service-jobs with idempotency", async () => {
    vi.mocked(prisma.shopMember.findUnique).mockResolvedValueOnce({
      id: "mem-1",
      shopId,
      userId,
      isActive: true,
      role: { name: "OWNER", rolePermissions: [] },
    } as any);

    vi.mocked(prisma.idempotencyKey.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.idempotencyKey.upsert).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.idempotencyKey.update).mockResolvedValueOnce({} as any);

    vi.mocked(prisma.customer.findUnique).mockResolvedValueOnce({
      id: customerId,
      shopId,
      name: "Tariqul Islam",
    } as any);

    vi.mocked(prisma.serviceJob.count).mockResolvedValueOnce(0);
    vi.mocked(prisma.serviceJob.create).mockResolvedValueOnce({
      id: jobId,
      shopId,
      jobNumber: "JOB-000001",
      deviceBrand: "Xiaomi",
      deviceModel: "Redmi Note 12",
      status: "INTAKE",
    } as any);

    const req = new Request("http://localhost:3000/api/v1/service-jobs", {
      method: "POST",
      headers: {
        "x-test-user-id": userId,
        "Content-Type": "application/json",
        "Idempotency-Key": "service-intake-test-key-1",
      },
      body: JSON.stringify({
        shopId,
        customerId,
        deviceBrand: "Xiaomi",
        deviceModel: "Redmi Note 12",
        intakeCondition: "Camera lens cracked",
        reportedIssue: "Camera blurry, does not focus",
      }),
    });

    const res = await postServiceJob(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.jobNumber).toBe("JOB-000001");
    expect(body.data.status).toBe("INTAKE");
  });

  it("submits diagnostic findings and estimate via PATCH /api/v1/service-jobs/[id]", async () => {
    vi.mocked(prisma.shopMember.findUnique).mockResolvedValueOnce({
      id: "mem-1",
      shopId,
      userId,
      isActive: true,
      role: { name: "OWNER", rolePermissions: [] },
    } as any);

    vi.mocked(prisma.serviceJob.findUnique).mockResolvedValueOnce({
      id: jobId,
      shopId,
      status: "DIAGNOSING",
    } as any);

    vi.mocked(prisma.serviceDiagnostic.create).mockResolvedValueOnce({
      id: "diag-1",
      estimatedLabour: 400 as any,
      estimatedParts: 600 as any,
    } as any);

    vi.mocked(prisma.serviceJob.update).mockResolvedValueOnce({
      id: jobId,
      status: "ESTIMATE_APPROVED",
      estimatedCost: 1000 as any,
    } as any);

    const req = new Request(`http://localhost:3000/api/v1/service-jobs/${jobId}`, {
      method: "PATCH",
      headers: {
        "x-test-user-id": userId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shopId,
        diagnostic: {
          diagnosisFindings: "Camera module glass and sensor replacement needed",
          estimatedLabour: 400,
          estimatedParts: 600,
          customerApproved: true,
        },
      }),
    });

    const res = await patchServiceJob(req, { params: Promise.resolve({ id: jobId }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.status).toBe("ESTIMATE_APPROVED");
  });

  it("consumes parts from inventory via POST /api/v1/service-jobs/[id]/consume-parts", async () => {
    vi.mocked(prisma.shopMember.findUnique).mockResolvedValueOnce({
      id: "mem-1",
      shopId,
      userId,
      isActive: true,
      role: { name: "OWNER", rolePermissions: [] },
    } as any);

    vi.mocked(prisma.idempotencyKey.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.idempotencyKey.upsert).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.idempotencyKey.update).mockResolvedValueOnce({} as any);

    vi.mocked(prisma.serviceJob.findUnique).mockResolvedValueOnce({
      id: jobId,
      shopId,
      jobNumber: "JOB-000001",
      status: "IN_REPAIR",
      partsCost: 0 as any,
      labourCost: 400 as any,
      outsideCost: 0 as any,
      paidAmount: 0 as any,
    } as any);

    vi.mocked(prisma.product.findUnique).mockResolvedValue({
      id: productId,
      shopId,
      isTrackStock: true,
      name: "Redmi Note 12 Camera Module",
      costPrice: 400 as any,
      sellingPrice: 600 as any,
    } as any);

    vi.mocked(prisma.stockBalance.findFirst).mockResolvedValue({
      id: "bal-1",
      shopId,
      productId,
      locationId,
      quantityOnHand: 4 as any,
      averageCost: 400 as any,
    } as any);

    vi.mocked(prisma.servicePart.create).mockResolvedValueOnce({
      id: "sp-1",
      quantity: 1,
      sellingPrice: 600 as any,
      subtotal: 600 as any,
    } as any);

    vi.mocked(prisma.stockBalance.update).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.stockMovement.create).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.serviceJob.update).mockResolvedValueOnce({
      id: jobId,
      partsCost: 600 as any,
      totalAmount: 1000 as any,
    } as any);

    vi.mocked(prisma.account.findMany).mockResolvedValueOnce([
      { id: "acc-5100", code: "5100" },
      { id: "acc-1200", code: "1200" },
    ] as any);
    vi.mocked(prisma.journalEntry.create).mockResolvedValueOnce({ id: "je-parts" } as any);

    const req = new Request(`http://localhost:3000/api/v1/service-jobs/${jobId}/consume-parts`, {
      method: "POST",
      headers: {
        "x-test-user-id": userId,
        "Content-Type": "application/json",
        "Idempotency-Key": "part-consume-key-1",
      },
      body: JSON.stringify({
        shopId,
        productId,
        locationId,
        quantity: 1,
        requestedSellingPrice: 600,
      }),
    });

    const res = await consumePartsRoute(req, { params: Promise.resolve({ id: jobId }) });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.servicePart.subtotal).toBe(600);
  });

  it("delivers repaired device, issues warranty, and collects payment via POST /api/v1/service-jobs/[id]/deliver", async () => {
    vi.mocked(prisma.shopMember.findUnique).mockResolvedValueOnce({
      id: "mem-1",
      shopId,
      userId,
      isActive: true,
      role: { name: "OWNER", rolePermissions: [] },
    } as any);

    vi.mocked(prisma.idempotencyKey.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.idempotencyKey.upsert).mockResolvedValueOnce({} as any);
    vi.mocked(prisma.idempotencyKey.update).mockResolvedValueOnce({} as any);

    vi.mocked(prisma.serviceJob.findUnique).mockResolvedValueOnce({
      id: jobId,
      shopId,
      jobNumber: "JOB-000001",
      status: "READY_FOR_DELIVERY",
      totalAmount: 1000 as any,
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
      paidAmount: 1000 as any,
      paymentStatus: "PAID",
    } as any);

    const req = new Request(`http://localhost:3000/api/v1/service-jobs/${jobId}/deliver`, {
      method: "POST",
      headers: {
        "x-test-user-id": userId,
        "Content-Type": "application/json",
        "Idempotency-Key": "deliver-key-1",
      },
      body: JSON.stringify({
        shopId,
        paymentMethod: "CASH",
        paidAmount: 1000,
        warrantyDays: 30,
      }),
    });

    const res = await deliverRoute(req, { params: Promise.resolve({ id: jobId }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.status).toBe("DELIVERED");
    expect(body.data.paymentStatus).toBe("PAID");
  });
});
