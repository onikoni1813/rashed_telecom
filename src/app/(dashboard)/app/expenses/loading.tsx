import React from "react";
import { PageSkeleton } from "@/components/layout/page-skeleton";

export default function Loading() {
  return <PageSkeleton cardsCount={4} showFilters={true} />;
}
