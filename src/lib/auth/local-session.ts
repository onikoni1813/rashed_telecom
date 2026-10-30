import crypto from "node:crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "rashed-telecom-pos-biometric-salt-key-2026";
export const COOKIE_SESSION_NAME = "rt_session";

export interface SessionPayload {
  userId: string;
  email?: string | null;
  roleName?: string;
  shopId: string;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Hashes a 4-6 digit numeric PIN using SHA-256 with salt
 */
export function hashPin(pin: string, providedSalt?: string): { hash: string; salt: string } {
  const salt = providedSalt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHmac("sha256", salt).update(pin.trim()).digest("hex");
  return { hash, salt };
}

/**
 * Verifies a PIN against stored hash and salt
 */
export function verifyPin(pin: string, salt: string, hash: string): boolean {
  const calculated = crypto.createHmac("sha256", salt).update(pin.trim()).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(calculated, "hex"), Buffer.from(hash, "hex"));
}

/**
 * Creates a tamper-proof signed session token containing user context
 * Valid for 30 days by default (suitable for shop POS terminals & offline PWA)
 */
export function createLocalSessionToken(
  data: Omit<SessionPayload, "issuedAt" | "expiresAt">,
  durationDays = 30
): string {
  const now = Date.now();
  const payload: SessionPayload = {
    ...data,
    issuedAt: now,
    expiresAt: now + durationDays * 24 * 60 * 60 * 1000,
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadStr)
    .digest("base64url");

  return `${payloadStr}.${signature}`;
}

/**
 * Verifies and decodes a local session token
 */
export function verifyLocalSessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }

  const [payloadStr, signature] = token.split(".");
  if (!payloadStr || !signature) {
    return null;
  }

  const expectedSig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadStr)
    .digest("base64url");

  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const json = Buffer.from(payloadStr, "base64url").toString("utf8");
    const payload: SessionPayload = JSON.parse(json);

    if (Date.now() > payload.expiresAt) {
      return null; // Session expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Parses a cookie string from headers
 */
export function parseCookie(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

