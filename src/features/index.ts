/**
 * Feature module exports placeholder for Phase 0
 * Feature domains will be incrementally implemented per Phase 1-6
 */
export const FEATURES = [
  "dashboard",
  "products",
  "inventory",
  "purchases",
  "sales",
  "servicing",
  "customers",
  "suppliers",
  "expenses",
  "accounting",
  "staff",
  "reports",
] as const;

export type FeatureName = (typeof FEATURES)[number];
