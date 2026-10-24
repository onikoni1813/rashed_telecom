import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createApprovalRequest,
  reviewApprovalRequest,
  getApprovalRequests,
} from "@/features/approvals/approval-service";
import { ValidationError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    approvalRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("Maker-Checker Approvals Domain Service", () => {
  const shopId = "11111111-1111-1111-1111-111111111111";
  const makerId = "user-maker-001";
  const checkerId = "user-checker-002";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createApprovalRequest", () => {
    it("successfully creates pending approval request and writes audit log", async () => {
      vi.mocked(prisma.approvalRequest.create).mockResolvedValueOnce({
        id: "req-1",
        shopId,
        requestType: "STOCK_ADJUSTMENT",
        status: "PENDING",
        requestedById: makerId,
      } as any);

      const result = await createApprovalRequest({
        shopId,
        requestType: "STOCK_ADJUSTMENT",
        referenceId: "ADJ-001",
        requestedById: makerId,
        details: { reason: "Damaged battery during testing", amount: 1200 },
      });

      expect(result.id).toBe("req-1");
      expect(prisma.approvalRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shopId,
            requestType: "STOCK_ADJUSTMENT",
            requestedById: makerId,
            status: "PENDING",
          }),
        })
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "approval.request",
            entityType: "ApprovalRequest",
          }),
        })
      );
    });
  });

  describe("reviewApprovalRequest", () => {
    it("throws ValidationError when review reason is missing", async () => {
      await expect(
        reviewApprovalRequest({
          shopId,
          requestId: "req-1",
          decision: "APPROVED",
          reviewerId: checkerId,
          reviewReason: "",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("throws NotFoundError when request does not exist", async () => {
      vi.mocked(prisma.approvalRequest.findUnique).mockResolvedValueOnce(null);

      await expect(
        reviewApprovalRequest({
          shopId,
          requestId: "non-existent-id",
          decision: "APPROVED",
          reviewerId: checkerId,
          reviewReason: "Looks good",
        })
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ValidationError when request has already been reviewed", async () => {
      vi.mocked(prisma.approvalRequest.findUnique).mockResolvedValueOnce({
        id: "req-1",
        shopId,
        requestedById: makerId,
        status: "APPROVED",
      } as any);

      await expect(
        reviewApprovalRequest({
          shopId,
          requestId: "req-1",
          decision: "REJECTED",
          reviewerId: checkerId,
          reviewReason: "Changed my mind",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("STRICT MAKER-CHECKER ENFORCEMENT: throws ForbiddenError when requester attempts self-approval", async () => {
      vi.mocked(prisma.approvalRequest.findUnique).mockResolvedValueOnce({
        id: "req-1",
        shopId,
        requestedById: makerId, // Maker
        status: "PENDING",
      } as any);

      await expect(
        reviewApprovalRequest({
          shopId,
          requestId: "req-1",
          decision: "APPROVED",
          reviewerId: makerId, // Same user attempting self-approval!
          reviewReason: "I approve my own request",
        })
      ).rejects.toThrow(ForbiddenError);

      expect(prisma.approvalRequest.update).not.toHaveBeenCalled();
    });

    it("successfully approves request when reviewed by different authorized staff member", async () => {
      vi.mocked(prisma.approvalRequest.findUnique).mockResolvedValueOnce({
        id: "req-1",
        shopId,
        requestedById: makerId,
        status: "PENDING",
      } as any);

      vi.mocked(prisma.approvalRequest.update).mockResolvedValueOnce({
        id: "req-1",
        shopId,
        requestedById: makerId,
        status: "APPROVED",
        reviewedById: checkerId,
        reviewReason: "Verified battery damage with technician",
      } as any);

      const result = await reviewApprovalRequest({
        shopId,
        requestId: "req-1",
        decision: "APPROVED",
        reviewerId: checkerId,
        reviewReason: "Verified battery damage with technician",
      });

      expect(result.status).toBe("APPROVED");
      expect(prisma.approvalRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "req-1" },
          data: expect.objectContaining({
            status: "APPROVED",
            reviewedById: checkerId,
            reviewReason: "Verified battery damage with technician",
          }),
        })
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "approval.approve",
            actorId: checkerId,
          }),
        })
      );
    });

    it("successfully rejects request when reviewed by different authorized staff member", async () => {
      vi.mocked(prisma.approvalRequest.findUnique).mockResolvedValueOnce({
        id: "req-1",
        shopId,
        requestedById: makerId,
        status: "PENDING",
      } as any);

      vi.mocked(prisma.approvalRequest.update).mockResolvedValueOnce({
        id: "req-1",
        shopId,
        requestedById: makerId,
        status: "REJECTED",
        reviewedById: checkerId,
        reviewReason: "Discount amount exceeds acceptable limits",
      } as any);

      const result = await reviewApprovalRequest({
        shopId,
        requestId: "req-1",
        decision: "REJECTED",
        reviewerId: checkerId,
        reviewReason: "Discount amount exceeds acceptable limits",
      });

      expect(result.status).toBe("REJECTED");
      expect(prisma.approvalRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "req-1" },
          data: expect.objectContaining({
            status: "REJECTED",
            reviewedById: checkerId,
          }),
        })
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "approval.reject",
            actorId: checkerId,
          }),
        })
      );
    });
  });
});
