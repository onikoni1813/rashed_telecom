import React from "react";
import { getShopSettings } from "@/features/settings/settings-service";
import { SettingsView } from "@/features/settings/settings-view";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const defaultShopId = "11111111-1111-1111-1111-111111111111";

  const settings = await getShopSettings(defaultShopId);

  return <SettingsView shopId={defaultShopId} initialSettings={settings} />;
}
