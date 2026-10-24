import { describe, it, expect } from "vitest";
import {
  formatBDT,
  formatDhakaDate,
  toBengaliNumerals,
  getDictionary,
} from "@/lib/i18n";

describe("Localization and Formatting Utilities", () => {
  it("converts western digits to Bengali digits", () => {
    expect(toBengaliNumerals("1234567890")).toBe("১২৩৪৫৬৭৮৯০");
  });

  it("formats BDT currency in English format", () => {
    expect(formatBDT(1250, "en")).toBe("৳ 1,250.00");
    expect(formatBDT("50000.5", "en")).toBe("৳ 50,000.50");
  });

  it("formats BDT currency in Bengali numerals", () => {
    expect(formatBDT(1250, "bn")).toBe("৳ ১,২৫০.০০");
  });

  it("handles invalid number gracefully", () => {
    expect(formatBDT("invalid")).toBe("৳ 0.00");
  });

  it("formats dates in Asia/Dhaka timezone", () => {
    // 2026-10-24T06:00:00Z is 12:00 PM in Asia/Dhaka (+6 UTC)
    const testDate = new Date("2026-10-24T06:00:00Z");
    const formatted = formatDhakaDate(testDate, "en", true);

    expect(formatted).toContain("2026");
    expect(formatted).toContain("12:00");
    expect(formatted).toContain("PM");
  });

  it("provides complete Bengali and English navigation dictionaries", () => {
    const bnDict = getDictionary("bn");
    const enDict = getDictionary("en");

    expect(bnDict.shopName).toBe("রাশেদ টেলিকম");
    expect(enDict.shopName).toBe("Rashed Telecom");
    expect(bnDict.nav.dashboard).toBe("ড্যাশবোর্ড");
    expect(enDict.nav.dashboard).toBe("Dashboard");
    expect(bnDict.nav.pos).toBe("বিক্রয় কেন্দ্র (POS)");
    expect(enDict.nav.pos).toBe("Point of Sale (POS)");
  });
});
