import React from "react";

interface PageSkeletonProps {
  title?: string;
  badge?: string;
  subtitle?: string;
  cardsCount?: number;
  showFilters?: boolean;
  showFilter?: boolean;
  rowsCount?: number;
}

export function PageSkeleton({
  title,
  badge,
  subtitle,
  cardsCount = 4,
  showFilters = true,
  showFilter,
  rowsCount = 6,
}: PageSkeletonProps) {
  const displayFilters = showFilter !== undefined ? showFilter : showFilters;
  return (
    <div className="w-full space-y-6 animate-pulse select-none">
      {/* Top Header & Breadcrumb Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div className="space-y-2">
          {title ? (
            <h1 className="text-xl sm:text-2xl font-black text-foreground/80 tracking-tight flex items-center gap-2">
              <span>{title}</span>
              {badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {badge}
                </span>
              )}
            </h1>
          ) : (
            <div className="h-8 w-56 bg-muted rounded-xl" />
          )}
          {subtitle ? (
            <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
          ) : (
            <div className="h-4 w-72 bg-muted/60 rounded-lg" />
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-28 bg-muted/80 rounded-xl" />
          <div className="h-9 w-32 bg-primary/20 rounded-xl" />
        </div>
      </div>

      {/* KPI Metric Cards */}
      {cardsCount > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: cardsCount }).map((_, i) => (
            <div
              key={i}
              className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-card/60 space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-20 bg-muted rounded" />
                <div className="h-8 w-8 rounded-xl bg-muted/80" />
              </div>
              <div className="h-7 w-24 bg-muted/90 rounded-lg" />
              <div className="h-3 w-32 bg-muted/40 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Filter / Search Bar */}
      {displayFilters && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-border/50 bg-card/40">
          <div className="h-9 w-64 bg-muted/70 rounded-xl" />
          <div className="flex items-center gap-2">
            <div className="h-9 w-24 bg-muted/60 rounded-xl" />
            <div className="h-9 w-24 bg-muted/60 rounded-xl" />
          </div>
        </div>
      )}

      {/* Main Data Content Area */}
      <div className="p-5 sm:p-6 rounded-2xl border border-border/60 bg-card/60 space-y-4 shadow-xs">
        <div className="space-y-3">
          {Array.from({ length: rowsCount }).map((_, row) => (
            <div
              key={row}
              className="h-12 w-full bg-muted/30 rounded-xl flex items-center px-4 justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-muted/70" />
                <div className="h-4 w-40 bg-muted/60 rounded" />
              </div>
              <div className="h-4 w-28 bg-muted/40 rounded hidden sm:block" />
              <div className="h-7 w-20 bg-muted/60 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
