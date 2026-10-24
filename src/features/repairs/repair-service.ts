import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { recordStockMovement } from "@/features/inventory/stock-service";
import { postJournalEntry } from "@/features/sales/accounting-posting";
import { recordAuditLog } from "@/lib/audit/service";

// Valid State Transitions for Service Jobs
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  INTAKE: ["DIAGNOSING", "CANCELLED"],
  DIAGNOSING: ["ESTIMATE_PENDING", "ESTIMATE_APPROVED", "CANCELLED"],
  ESTIMATE_PENDING: ["ESTIMATE_APPROVED", "ESTIMATE_REJECTED", "CANCELLED"],
  ESTIMATE_REJECTED: ["READY_FOR_DELIVERY", "CANCELLED"],
  ESTIMATE_APPROVED: ["IN_REPAIR", "CANCELLED"],
  IN_REPAIR: ["READY_FOR_DELIVERY", "CANCELLED"],
  READY_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [], // Terminal status
  CANCELLED: [], // Terminal status
};

export interface CreateServiceJobInput {
  shopId: string;
  customerId: string;
  deviceBrand: string;
  deviceModel: string;
  deviceImei?: string | null;
  deviceColor?: string | null;
  intakeCondition: string;
  accessoriesReceived?: string | null;
  reportedIssue: string;
  promisedDate?: Date | null;
  assignedTechnicianId?: string | null;
  intakeCashierId: string;
  notes?: string | null;
}

export async function createServiceJob(input: CreateServiceJobInput) {
  // Validate basic inputs
  if (!input.deviceBrand || !input.deviceModel || !input.intakeCondition || !input.reportedIssue) {
    throw new ValidationError(
      "Missing required fields: deviceBrand, deviceModel, intakeCondition, and reportedIssue are mandatory."
    );
  }

  // Security Check: Enforce NO PIN or Password in intake fields
  const forbiddenPatterns = [
    /\b(pin|password|passcode)\b[:\s=]*[a-zA-Z0-9]+/i,
    /pattern[:\s=]*[a-zA-Z0-9]+/i,
  ];

  const payloadCombined = `${input.intakeCondition} ${input.reportedIssue} ${input.notes || ""}`;
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(payloadCombined)) {
      throw new ValidationError(
        "Security policy violation: Storing customer device PINs, passwords, or unlock patterns is strictly prohibited."
      );
    }
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Verify customer exists in shop
    const customer = await tx.customer.findUnique({
      where: { id: input.customerId },
    });

    if (!customer || customer.shopId !== input.shopId) {
      throw new NotFoundError("Customer not found or does not belong to this shop.");
    }

    // 2. Generate sequential unique Job Number
    const count = await tx.serviceJob.count({ where: { shopId: input.shopId } });
    const jobNumber = `JOB-${String(count + 1).padStart(6, "0")}`;

    // 3. Create Service Job
    const job = await tx.serviceJob.create({
      data: {
        shopId: input.shopId,
        jobNumber,
        customerId: input.customerId,
        deviceBrand: input.deviceBrand,
        deviceModel: input.deviceModel,
        deviceImei: input.deviceImei || null,
        deviceColor: input.deviceColor || null,
        intakeCondition: input.intakeCondition,
        accessoriesReceived: input.accessoriesReceived || null,
        reportedIssue: input.reportedIssue,
        status: "INTAKE",
        assignedTechnicianId: input.assignedTechnicianId || null,
        intakeCashierId: input.intakeCashierId,
        promisedDate: input.promisedDate || null,
        notes: input.notes || null,
        statusHistory: {
          create: {
            fromStatus: "INTAKE",
            toStatus: "INTAKE",
            changedById: input.intakeCashierId,
            notes: "Device intake received at counter",
          },
        },
      },
      include: {
        customer: true,
        assignedTechnician: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    // 4. Audit Trail
    await recordAuditLog({
      shopId: input.shopId,
      actorId: input.intakeCashierId,
      action: "service.create",
      entityType: "ServiceJob",
      entityId: job.id,
      reason: `Intake device ${job.deviceBrand} ${job.deviceModel} (${jobNumber})`,
      afterState: {
        jobNumber,
        customerId: input.customerId,
        device: `${job.deviceBrand} ${job.deviceModel}`,
      },
    });

    return job;
  });
}

export interface UpdateJobStatusInput {
  shopId: string;
  jobId: string;
  newStatus: string;
  actorId: string;
  notes?: string | null;
}

export async function updateServiceJobStatus(input: UpdateJobStatusInput) {
  return await prisma.$transaction(async (tx) => {
    const job = await tx.serviceJob.findUnique({
      where: { id: input.jobId },
    });

    if (!job || job.shopId !== input.shopId) {
      throw new NotFoundError("Service job not found or does not belong to this shop.");
    }

    if (job.status === input.newStatus) {
      return job;
    }

    // Validate Transition
    const allowedTransitions = VALID_STATUS_TRANSITIONS[job.status] || [];
    if (!allowedTransitions.includes(input.newStatus)) {
      throw new ValidationError(
        `Invalid status transition from '${job.status}' to '${input.newStatus}'. Allowed: ${allowedTransitions.join(", ") || "None"}.`
      );
    }

    // Update status & record history
    const updatedJob = await tx.serviceJob.update({
      where: { id: job.id },
      data: {
        status: input.newStatus,
        statusHistory: {
          create: {
            fromStatus: job.status,
            toStatus: input.newStatus,
            changedById: input.actorId,
            notes: input.notes || null,
          },
        },
      },
      include: {
        customer: true,
        assignedTechnician: true,
        statusHistory: { orderBy: { createdAt: "desc" } },
      },
    });

    await recordAuditLog({
      shopId: input.shopId,
      actorId: input.actorId,
      action: "service.update_status",
      entityType: "ServiceJob",
      entityId: job.id,
      reason: `Status changed from ${job.status} to ${input.newStatus}`,
      beforeState: { status: job.status },
      afterState: { status: input.newStatus },
    });

    return updatedJob;
  });
}

export interface SubmitDiagnosticInput {
  shopId: string;
  jobId: string;
  technicianId: string;
  diagnosisFindings: string;
  estimatedLabour: number;
  estimatedParts: number;
  customerApproved?: boolean;
  customerNotes?: string | null;
}

export async function submitDiagnosticEstimate(input: SubmitDiagnosticInput) {
  if (!input.diagnosisFindings || input.estimatedLabour < 0 || input.estimatedParts < 0) {
    throw new ValidationError("Valid diagnosis findings and non-negative estimates are required.");
  }

  return await prisma.$transaction(async (tx) => {
    const job = await tx.serviceJob.findUnique({
      where: { id: input.jobId },
    });

    if (!job || job.shopId !== input.shopId) {
      throw new NotFoundError("Service job not found.");
    }

    const totalEstimate = input.estimatedLabour + input.estimatedParts;
    const nextStatus = input.customerApproved ? "ESTIMATE_APPROVED" : "ESTIMATE_PENDING";

    // Create Diagnostic record
    const diagnostic = await tx.serviceDiagnostic.create({
      data: {
        serviceJobId: job.id,
        technicianId: input.technicianId,
        diagnosisFindings: input.diagnosisFindings,
        estimatedLabour: new Prisma.Decimal(input.estimatedLabour),
        estimatedParts: new Prisma.Decimal(input.estimatedParts),
        customerApproved: input.customerApproved || false,
        approvedAt: input.customerApproved ? new Date() : null,
        customerNotes: input.customerNotes || null,
      },
    });

    // Update Job
    const updatedJob = await tx.serviceJob.update({
      where: { id: job.id },
      data: {
        status: nextStatus,
        estimatedCost: new Prisma.Decimal(totalEstimate),
        labourCost: new Prisma.Decimal(input.estimatedLabour),
        totalAmount: new Prisma.Decimal(totalEstimate),
        statusHistory: {
          create: {
            fromStatus: job.status,
            toStatus: nextStatus,
            changedById: input.technicianId,
            notes: `Diagnostic completed. Estimated cost: ৳${totalEstimate}`,
          },
        },
      },
      include: {
        diagnostics: true,
        statusHistory: true,
      },
    });

    await recordAuditLog({
      shopId: input.shopId,
      actorId: input.technicianId,
      action: "service.diagnostic",
      entityType: "ServiceJob",
      entityId: job.id,
      reason: `Diagnosis submitted for ${job.jobNumber}. Estimate: ৳${totalEstimate}`,
      afterState: {
        estimatedCost: totalEstimate,
        status: nextStatus,
      },
    });

    return { diagnostic, job: updatedJob };
  });
}

export interface ApproveEstimateInput {
  shopId: string;
  jobId: string;
  approved: boolean;
  actorId: string;
  notes?: string | null;
}

export async function approveEstimate(input: ApproveEstimateInput) {
  return await prisma.$transaction(async (tx) => {
    const job = await tx.serviceJob.findUnique({
      where: { id: input.jobId },
      include: { diagnostics: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (!job || job.shopId !== input.shopId) {
      throw new NotFoundError("Service job not found.");
    }

    const latestDiag = job.diagnostics[0];
    if (!latestDiag) {
      throw new ValidationError("Cannot approve estimate: No diagnostic estimate exists for this job.");
    }

    const nextStatus = input.approved ? "ESTIMATE_APPROVED" : "ESTIMATE_REJECTED";

    await tx.serviceDiagnostic.update({
      where: { id: latestDiag.id },
      data: {
        customerApproved: input.approved,
        approvedAt: new Date(),
        customerNotes: input.notes || null,
      },
    });

    const updatedJob = await tx.serviceJob.update({
      where: { id: job.id },
      data: {
        status: nextStatus,
        statusHistory: {
          create: {
            fromStatus: job.status,
            toStatus: nextStatus,
            changedById: input.actorId,
            notes: input.approved ? "Customer approved estimate" : "Customer rejected estimate",
          },
        },
      },
      include: { diagnostics: true, statusHistory: true },
    });

    await recordAuditLog({
      shopId: input.shopId,
      actorId: input.actorId,
      action: "service.approve_estimate",
      entityType: "ServiceJob",
      entityId: job.id,
      reason: `Customer ${input.approved ? "approved" : "rejected"} estimate for ${job.jobNumber}`,
      afterState: { status: nextStatus, approved: input.approved },
    });

    return updatedJob;
  });
}

export interface ConsumeServicePartInput {
  shopId: string;
  jobId: string;
  productId: string;
  variantId?: string | null;
  locationId: string;
  quantity: number;
  requestedSellingPrice?: number;
  consumedById: string;
}

export async function consumeServicePart(input: ConsumeServicePartInput) {
  if (input.quantity <= 0) {
    throw new ValidationError("Quantity must be greater than zero.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch job
    const job = await tx.serviceJob.findUnique({
      where: { id: input.jobId },
    });

    if (!job || job.shopId !== input.shopId) {
      throw new NotFoundError("Service job not found.");
    }

    if (job.status === "DELIVERED" || job.status === "CANCELLED") {
      throw new ValidationError(`Cannot consume parts for job in '${job.status}' status.`);
    }

    // 2. Fetch product & verify on-hand stock
    const product = await tx.product.findUnique({
      where: { id: input.productId },
    });

    if (!product || product.shopId !== input.shopId) {
      throw new NotFoundError("Spare part product not found.");
    }

    const stockBalance = await tx.stockBalance.findFirst({
      where: {
        shopId: input.shopId,
        productId: product.id,
        variantId: input.variantId || null,
        locationId: input.locationId,
      },
    });

    const currentQty = stockBalance ? Number(stockBalance.quantityOnHand) : 0;
    if (currentQty < input.quantity) {
      throw new ValidationError(
        `Insufficient stock for spare part '${product.name}'. Available: ${currentQty}, requested: ${input.quantity}.`
      );
    }

    const unitCost = Number(product.costPrice);
    const sellingPrice = input.requestedSellingPrice !== undefined
      ? input.requestedSellingPrice
      : Number(product.sellingPrice);
    const subtotal = input.quantity * sellingPrice;
    const totalCost = input.quantity * unitCost;

    // 3. Create ServicePart record
    const servicePart = await tx.servicePart.create({
      data: {
        serviceJobId: job.id,
        productId: product.id,
        variantId: input.variantId || null,
        quantity: input.quantity,
        unitCost: new Prisma.Decimal(unitCost),
        sellingPrice: new Prisma.Decimal(sellingPrice),
        subtotal: new Prisma.Decimal(subtotal),
        consumedById: input.consumedById,
      },
    });

    // 4. Record authoritative StockMovement (deduction from inventory)
    await recordStockMovement(
      {
        shopId: input.shopId,
        productId: product.id,
        variantId: input.variantId || null,
        locationId: input.locationId,
        movementType: "SERVICE_CONSUMPTION",
        referenceType: "ServiceJob",
        referenceId: job.id,
        quantity: -input.quantity, // Negative deduction
        unitCost,
        reason: `Repair job ${job.jobNumber} parts consumption (${product.name})`,
        actorId: input.consumedById,
      },
      tx
    );

    // 5. Update ServiceJob totals
    const newPartsCost = Number(job.partsCost) + subtotal;
    const newTotalAmount = Number(job.labourCost) + newPartsCost + Number(job.outsideCost);

    const updatedJob = await tx.serviceJob.update({
      where: { id: job.id },
      data: {
        partsCost: new Prisma.Decimal(newPartsCost),
        totalAmount: new Prisma.Decimal(newTotalAmount),
        dueAmount: new Prisma.Decimal(Math.max(0, newTotalAmount - Number(job.paidAmount))),
      },
    });

    // 6. Post Balanced Double-Entry Journal:
    // Debit Direct Service Costs (5100)
    // Credit Inventory (1200)
    if (totalCost > 0) {
      await postJournalEntry(
        {
          shopId: input.shopId,
          sourceType: "EXPENSE",
          sourceId: job.id,
          description: `Repair ${job.jobNumber} parts cost (${product.name})`,
          lines: [
            {
              accountCode: "5100", // Direct Service Costs
              debit: totalCost,
              description: `Direct parts cost for ${job.jobNumber}`,
            },
            {
              accountCode: "1200", // Inventory
              credit: totalCost,
              description: `Inventory consumed for ${job.jobNumber}`,
            },
          ],
        },
        tx
      );
    }

    // 7. Audit Log
    await recordAuditLog({
      shopId: input.shopId,
      actorId: input.consumedById,
      action: "service.consume_parts",
      entityType: "ServiceJob",
      entityId: job.id,
      reason: `Consumed ${input.quantity}x ${product.name} for ${job.jobNumber}`,
      afterState: {
        productId: product.id,
        quantity: input.quantity,
        partsCost: newPartsCost,
        totalAmount: newTotalAmount,
      },
    });

    return { servicePart, job: updatedJob };
  });
}

export interface DeliverServiceJobInput {
  shopId: string;
  jobId: string;
  deliveredById: string;
  paymentMethod: "CASH" | "BANK" | "BKASH" | "NAGAD" | "ROCKET";
  paidAmount: number;
  warrantyDays?: number;
  warrantyTerms?: string;
  notes?: string | null;
}

export async function deliverServiceJob(input: DeliverServiceJobInput) {
  if (input.paidAmount < 0) {
    throw new ValidationError("Paid amount cannot be negative.");
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch job with customer
    const job = await tx.serviceJob.findUnique({
      where: { id: input.jobId },
      include: { customer: true },
    });

    if (!job || job.shopId !== input.shopId) {
      throw new NotFoundError("Service job not found.");
    }

    if (job.status === "DELIVERED") {
      throw new ValidationError(`Job ${job.jobNumber} has already been delivered.`);
    }

    const totalAmount = Number(job.totalAmount);
    const dueAmount = Math.max(0, totalAmount - input.paidAmount);

    // 2. Validate Customer Due Policy
    if (dueAmount > 0) {
      await tx.customer.update({
        where: { id: job.customer.id },
        data: {
          totalDue: {
            increment: new Prisma.Decimal(dueAmount),
          },
        },
      });
    }

    const paymentStatus: "PAID" | "PARTIALLY_PAID" = dueAmount === 0 ? "PAID" : "PARTIALLY_PAID";

    // 3. Create Payment record if paidAmount > 0
    if (input.paidAmount > 0) {
      const payCount = await tx.payment.count({ where: { shopId: input.shopId } });
      const paymentNumber = `PAY-${String(payCount + 1).padStart(6, "0")}`;

      await tx.payment.create({
        data: {
          shopId: input.shopId,
          paymentNumber,
          customerId: job.customer.id,
          amount: new Prisma.Decimal(input.paidAmount),
          paymentMethod: input.paymentMethod,
          receivedBy: input.deliveredById,
        },
      });
    }

    // 4. Generate Warranty if applicable
    const warrantyDays = input.warrantyDays !== undefined ? input.warrantyDays : 30;
    if (warrantyDays > 0) {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + warrantyDays * 24 * 60 * 60 * 1000);

      await tx.serviceWarranty.create({
        data: {
          serviceJobId: job.id,
          warrantyDays,
          warrantyTerms: input.warrantyTerms || "Standard 30-day service warranty for parts & labour.",
          startDate,
          endDate,
        },
      });
    }

    // 5. Balanced Double-Entry Journal Posting:
    // Debit Cash (1000) for cash payment
    // Debit Bank/MFS (1010) for digital payment
    // Debit Accounts Receivable (1100) for remaining due
    // Credit Service Revenue (4100) for totalAmount
    if (totalAmount > 0) {
      const journalLines: Array<{ accountCode: string; debit?: number; credit?: number; description?: string }> = [];

      if (input.paidAmount > 0) {
        if (input.paymentMethod === "CASH") {
          journalLines.push({
            accountCode: "1000",
            debit: input.paidAmount,
            description: `Cash received for repair ${job.jobNumber}`,
          });
        } else {
          journalLines.push({
            accountCode: "1010",
            debit: input.paidAmount,
            description: `MFS/Bank received for repair ${job.jobNumber}`,
          });
        }
      }

      if (dueAmount > 0) {
        journalLines.push({
          accountCode: "1100", // Accounts Receivable
          debit: dueAmount,
          description: `Customer receivable for repair ${job.jobNumber}`,
        });
      }

      journalLines.push({
        accountCode: "4100", // Service Revenue
        credit: totalAmount,
        description: `Service revenue for repair ${job.jobNumber}`,
      });

      await postJournalEntry(
        {
          shopId: input.shopId,
          sourceType: "SALE",
          sourceId: job.id,
          description: `Service Delivery ${job.jobNumber}`,
          lines: journalLines,
        },
        tx
      );
    }

    // 6. Update Job Status to DELIVERED
    const deliveredJob = await tx.serviceJob.update({
      where: { id: job.id },
      data: {
        status: "DELIVERED",
        deliveryDate: new Date(),
        paidAmount: new Prisma.Decimal(input.paidAmount),
        dueAmount: new Prisma.Decimal(dueAmount),
        paymentStatus,
        notes: input.notes || job.notes,
        statusHistory: {
          create: {
            fromStatus: job.status,
            toStatus: "DELIVERED",
            changedById: input.deliveredById,
            notes: `Device delivered to customer. Collected: ৳${input.paidAmount}, Due: ৳${dueAmount}`,
          },
        },
      },
      include: {
        customer: true,
        parts: { include: { product: true } },
        warranties: true,
        statusHistory: true,
      },
    });

    // 7. Audit Log
    await recordAuditLog({
      shopId: input.shopId,
      actorId: input.deliveredById,
      action: "service.deliver",
      entityType: "ServiceJob",
      entityId: job.id,
      reason: `Delivered repair ${job.jobNumber}. Total: ৳${totalAmount}, Paid: ৳${input.paidAmount}`,
      afterState: {
        status: "DELIVERED",
        totalAmount,
        paidAmount: input.paidAmount,
        dueAmount,
        warrantyDays,
      },
    });

    return deliveredJob;
  });
}
