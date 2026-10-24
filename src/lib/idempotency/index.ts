/**
 * Idempotency foundations
 * Defined in Master_plan.md Section 6.7, 8.3
 */
export interface IdempotencyRecord<T = unknown> {
  key: string;
  shopId: string;
  requestHash: string;
  statusCode: number;
  responseBody: T;
  createdAt: string;
}
