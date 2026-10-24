/**
 * Authentication module foundation
 * Supabase Auth integration scheduled for Phase 1
 */
export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  shopId?: string;
  role?: string;
}
