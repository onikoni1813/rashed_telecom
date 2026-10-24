import { prisma } from "@/lib/db/prisma";
import { ValidationError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { recordAuditLog } from "@/lib/audit/service";

export interface CreateApprovalRequestInput {
  shopId: string;
  requestType: "STOCK_ADJUSTMENT" | "LARGE_DISCOUNT" | "SALARY_PAYOUT" | "DUE_WAIVER" | "EXPENSE_APPROVAL";
  referenceId?: string | null;
  requestedById: string;
  details?: Record<string, unknown> | null;
}

export async function createApprovalRequest(input: CreateApprovalRequestInput) {
  const request = await prisma.approvalRequest.create({
    data: {
      shopId: input.shopId,
      requestType: input.requestType,
      referenceId: input.referenceId || null,
      requestedById: input.requestedById,
      status: "PENDING",
      details: (input.details as any) || undefined,
    },
    include: {
      requestedBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  await recordAuditLog({
    shopId: input.shopId,
    actorId: input.requestedById,
    action: "approval.request",
    entityType: "ApprovalRequest",
    entityId: request.id,
    reason: `Submitted maker-checker approval request for ${input.requestType}`,
    afterState: { requestType: input.requestType, status: "PENDING" },
  });

  return request;
}

export interface ReviewApprovalRequestInput {
  shopId: string;
  requestId: string;
  decision: "APPROVED" | "REJECTED";
  reviewerId: string;
  reviewReason: string;
}

export async function reviewApprovalRequest(input: ReviewApprovalRequestInput) {
  if (!input.reviewReason || input.reviewReason.trim().length === 0) {
    throw new ValidationError("A review reason must be provided for approval or rejection.");
  }

  const request = await prisma.approvalRequest.findUnique({
    where: { id: input.requestId },
  });

  if (!request || request.shopId !== input.shopId) {
    throw new NotFoundError("Approval request not found.");
  }

  if (request.status !== "PENDING") {
    throw new ValidationError(`This request has already been reviewed (${request.status}).`);
  }

  // MANDATORY MAKER-CHECKER RULE: Self-Approval Prevention
  if (request.requestedById === input.reviewerId) {
    throw new ForbiddenError(
      "Maker-Checker Violation: Self-approval is strictly forbidden. A different authorized staff member must review this request."
    );
  }

  const updated = await prisma.approvalRequest.update({
    where: { id: request.id },
    data: {
      status: input.decision,
      reviewedById: input.reviewerId,
      reviewedAt: new Date(),
      reviewReason: input.reviewReason,
    },
    include: {
      requestedBy: {
        select: { id: true, fullName: true, email: true },
      },
      reviewedBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  await recordAuditLog({
    shopId: input.shopId,
    actorId: input.reviewerId,
    action: input.decision === "APPROVED" ? "approval.approve" : "approval.reject",
    entityType: "ApprovalRequest",
    entityId: updated.id,
    reason: `${input.decision} request ${request.id}: ${input.reviewReason}`,
    afterState: {
      status: input.decision,
      reviewedById: input.reviewerId,
      reviewReason: input.reviewReason,
    },
  });

  return updated;
}

export async function getApprovalRequests(shopId: string, status?: string) {
  return await prisma.approvalRequest.findMany({
    where: {
      shopId,
      ...(status ? { status } : {}),
    },
    include: {
      requestedBy: {
        select: { id: true, fullName: true, email: true },
      },
      reviewedBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
