import React, { Suspense } from "react";
import { getApprovalRequests } from "@/features/approvals/approval-service";
import {
  ApprovalsView,
  SerializedApprovalRequest,
} from "@/features/approvals/approvals-view";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export const dynamic = "force-dynamic";

async function ApprovalsDataLoader() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";
  const defaultUserId = "00000000-0000-0000-0000-000000000001";

  const rawRequests = await getApprovalRequests(defaultShopId);

  const requests: SerializedApprovalRequest[] = rawRequests.map((r: any) => ({
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

export default function ApprovalsPage() {
  return (
    <Suspense
      fallback={
        <PageSkeleton
          title="অনুমোদন অনুরোধ (Approvals)"
          subtitle="ডিসকাউন্ট ও সমন্বয় অনুমোদনের তালিকা লোড হচ্ছে..."
          cardsCount={3}
          showFilter={true}
          rowsCount={6}
        />
      }
    >
      <ApprovalsDataLoader />
    </Suspense>
  );
}
