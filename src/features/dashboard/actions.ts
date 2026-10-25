"use server";

import {
  getPerformanceAnalytics,
  AnalyticsPeriod,
  PerformanceAnalyticsResult,
} from "./analytics-service";

export async function fetchPerformanceAnalyticsAction(
  shopId: string,
  period: AnalyticsPeriod,
  startDate?: string,
  endDate?: string
): Promise<PerformanceAnalyticsResult> {
  return await getPerformanceAnalytics({
    shopId,
    period,
    startDate,
    endDate,
  });
}
