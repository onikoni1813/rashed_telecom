import React from "react";
import { getApprovalRequests } from "@/features/approvals/approval-service";
import {
  ApprovalsView,
  SerializedApprovalRequest,
} from "@/features/approvals/approvals-view";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";
  const defaultUserId = "00000000-0000-0000-0000-000000000001";

  const rawRequests = await getApprovalRequests(defaultShopId);

  const requests: SerializedApprovalRequest[] = rawRequests.map((r) => ({
    id: r.id,
    requestType: r.requestType,
    referenceId: r.referenceId,
    status: r.status as "PENDING" | "APPROVED" | "REJECTED",
    requestedById: r.requestedById,
    requestedByName: r.requestedBy.fullName || "User",
    requestedByEmail: r.requestedBy.email,
    createdAt: r.createdAt.toISOString(),
    reviewedById: r.reviewedById,
    reviewedByName: r.reviewedBy?.fullName || null,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    reviewReason: r.reviewReason,
    details: (r.details as Record<string, unknown>) || null,
  }));

  return (
    <ApprovalsView
      shopId={defaultShopId}
      currentUserId={defaultUserId}
      requests={requests}
    />
  );
}
