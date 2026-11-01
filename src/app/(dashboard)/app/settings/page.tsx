import React, { Suspense } from "react";
import { getShopSettings } from "@/features/settings/settings-service";
import { SettingsView } from "@/features/settings/settings-view";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export const dynamic = "force-dynamic";

async function SettingsDataLoader() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";

  const settings = await getShopSettings(defaultShopId);

  return <SettingsView shopId={defaultShopId} initialSettings={settings} />;
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <PageSkeleton
          title="দোকান ও সিস্টেম সেটিংস"
          subtitle="কনফিগারেশন ও প্রিন্ট সেটিংস লোড হচ্ছে..."
          cardsCount={2}
          showFilter={false}
          rowsCount={5}
        />
      }
    >
      <SettingsDataLoader />
    </Suspense>
  );
}
