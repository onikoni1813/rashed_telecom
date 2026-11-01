import React, { Suspense } from "react";
import { searchAuditLogs } from "@/features/operations/import-export-service";
import {
  OperationsView,
  SerializedAuditLog,
} from "@/features/operations/operations-view";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export const dynamic = "force-dynamic";

async function OperationsDataLoader() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";

  const { logs, total } = await searchAuditLogs({
    shopId: defaultShopId,
    limit: 50,
  });

  const serializedLogs: SerializedAuditLog[] = logs.map((l: any) => ({
    id: l.id,
    createdAt: l.createdAt.toISOString(),
    actorName: l.actor?.fullName || "System",
    actorEmail: l.actor?.email || null,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    reason: l.reason,
    beforeState: (l.beforeState as Record<string, unknown>) || null,
    afterState: (l.afterState as Record<string, unknown>) || null,
    ipAddress: l.ipAddress,
  }));

  return (
    <OperationsView
      shopId={defaultShopId}
      initialAuditLogs={serializedLogs}
      totalLogs={total}
    />
  );
}

export default function OperationsPage() {
  return (
    <Suspense
      fallback={
        <PageSkeleton
          title="অপারেশনস ও সিস্টেম লগ"
          subtitle="ডাটা ব্যাকআপ, এক্সপোর্ট ও অডিট লগ লোড হচ্ছে..."
          cardsCount={2}
          showFilter={true}
          rowsCount={6}
        />
      }
    >
      <OperationsDataLoader />
    </Suspense>
  );
}
