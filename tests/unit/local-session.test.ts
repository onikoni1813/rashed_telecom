import { describe, it, expect } from "vitest";
import {
  hashPin,
  verifyPin,
  createLocalSessionToken,
  verifyLocalSessionToken,
  parseCookie,
} from "@/lib/auth/local-session";

describe("Local Session & PIN Security", () => {
  it("hashes a PIN and successfully verifies correct PIN", () => {
    const { hash, salt } = hashPin("1234");
    expect(hash).toBeDefined();
    expect(salt).toBeDefined();

    expect(verifyPin("1234", salt, hash)).toBe(true);
    expect(verifyPin("9999", salt, hash)).toBe(false);
    expect(verifyPin("0000", salt, hash)).toBe(false);
  });

  it("generates a signed session token and decodes valid payload", () => {
    const payload = {
      userId: "user-uuid-1",
      email: "admin@rashedtelecom.local",
      roleName: "OWNER",
      shopId: "11111111-1111-1111-1111-111111111111",
    };

    const token = createLocalSessionToken(payload);
    expect(token).toContain(".");

    const decoded = verifyLocalSessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.email).toBe(payload.email);
    expect(decoded?.roleName).toBe(payload.roleName);
  });

  it("rejects tampered or corrupted session tokens", () => {
    const payload = {
      userId: "user-uuid-1",
      email: "admin@rashedtelecom.local",
      roleName: "OWNER",
      shopId: "11111111-1111-1111-1111-111111111111",
    };

    const token = createLocalSessionToken(payload);
    const [payloadStr, sig] = token.split(".");

    // Tamper with payload
    const tampered = `${payloadStr}A.${sig}`;
    expect(verifyLocalSessionToken(tampered)).toBeNull();

    // Invalid format
    expect(verifyLocalSessionToken("random-string-without-dots")).toBeNull();
    expect(verifyLocalSessionToken("")).toBeNull();
  });

  it("parses cookies accurately from header strings", () => {
    const header = "theme=dark; rt_session=my-secret-token; lang=bn";
    expect(parseCookie(header, "rt_session")).toBe("my-secret-token");
    expect(parseCookie(header, "theme")).toBe("dark");
    expect(parseCookie(header, "non_existent")).toBeNull();
    expect(parseCookie(null, "rt_session")).toBeNull();
  });
});
