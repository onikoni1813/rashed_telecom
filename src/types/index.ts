/**
 * Core type definitions for Rashed Telecom PWA
 * Standard API contracts matching Master_plan.md Section 8.1
 */

export interface ApiSuccessResponse<T = unknown> {
  data: T;
  meta: {
    requestId: string;
    timestamp?: string;
    [key: string]: unknown;
  };
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown> | unknown[];
  requestId: string;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export type Locale = "bn" | "en";

export interface ShopInfo {
  id: string;
  name: string;
  currency: string;
  timezone: string;
}

export interface NavItem {
  titleEn: string;
  titleBn: string;
  href: string;
  icon: string;
  badge?: string;
}
