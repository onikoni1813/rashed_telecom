import React from "react";

export default function DashboardSubpageLoading() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      {/* Top Header & Breadcrumb Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted rounded-xl" />
          <div className="h-4 w-72 bg-muted/60 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-muted rounded-xl" />
          <div className="h-9 w-32 bg-primary/20 rounded-xl" />
        </div>
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border border-border/60 bg-card/60 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-8 w-8 rounded-xl bg-muted/80" />
            </div>
            <div className="h-7 w-28 bg-muted rounded-lg" />
            <div className="h-3 w-16 bg-muted/50 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="p-5 sm:p-6 rounded-2xl border border-border/60 bg-card/60 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/40">
          <div className="h-9 w-64 bg-muted rounded-xl" />
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-muted rounded-xl" />
            <div className="h-9 w-24 bg-muted rounded-xl" />
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="h-12 w-full bg-muted/40 rounded-xl flex items-center px-4 justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-lg bg-muted" />
                <div className="h-4 w-36 bg-muted rounded" />
              </div>
              <div className="h-4 w-24 bg-muted/60 rounded hidden sm:block" />
              <div className="h-6 w-20 bg-muted/80 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

