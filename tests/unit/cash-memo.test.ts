import { describe, it, expect } from "vitest";
import {
  generateInvoiceShareText,
  numberToBengaliWords,
  InvoiceData,
  CashMemoShopSettings,
} from "@/features/sales/cash-memo";

describe("Cash Memo Sharing and Dynamic Settings", () => {
  const sampleInvoice: InvoiceData = {
    invoiceNumber: "INV-000001",
    createdAt: "2026-11-17T10:21:00Z",
    customerName: "ওয়াক-ইন কাস্টমার",
    customerPhone: "01712345678",
    customerAddress: "কালিয়াকৈর বাজার",
    cashierName: "অ্যাডমিন",
    items: [
      {
        id: "item-1",
        productName: "Remax 3.5mm Earphone",
        quantity: 1,
        unitPrice: 120,
        subtotal: 120,
      },
    ],
    subtotal: 120,
    discount: 40,
    totalAmount: 80,
    paidAmount: 80,
    dueAmount: 0,
  };

  const dynamicShopSettings: CashMemoShopSettings = {
    name: "রাশেদ টেলিকম",
    address: "কালিয়াকৈর বাজার, কালিয়াকৈর, গাজীপুর",
    phone: "01521378476",
    email: "rashedsarkarofficial@gmail.com",
    tagline: "মোবাইল বিক্রয়, সার্ভিসিং ও আধুনিক এক্সেসরিজ",
  };

  it("converts amounts to Bengali words correctly", () => {
    expect(numberToBengaliWords(80)).toBe("আশি টাকা মাত্র");
    expect(numberToBengaliWords(1250)).toBe("এক হাজার দুই শত পঞ্চাশ টাকা মাত্র");
    expect(numberToBengaliWords(0)).toBe("শূন্য টাকা মাত্র");
  });

  it("generates invoice share text with dynamic shop address and Bangla only name", () => {
    const text = generateInvoiceShareText(sampleInvoice, dynamicShopSettings);

    // Verify Bengali shop name is present and English RASHED TELECOM is NOT present
    expect(text).toContain("*রাশেদ টেলিকম*");
    expect(text).not.toContain("RASHED TELECOM");

    // Verify dynamic address and phone
    expect(text).toContain("কালিয়াকৈর বাজার, কালিয়াকৈর, গাজীপুর");
    expect(text).toContain("01521378476");

    // Verify invoice metadata and financials
    expect(text).toContain("INV-000001");
    expect(text).toContain("Remax 3.5mm Earphone");
    expect(text).toContain("সর্বমোট বিল (Net Total): ৳ 80.00");
    expect(text).toContain("পরিশোধিত (Paid): ৳ 80.00");
    expect(text).toContain("কথায়: আশি টাকা মাত্র");
  });

  it("reflects custom settings address when changed dynamically", () => {
    const customShopSettings: CashMemoShopSettings = {
      name: "রাশেদ টেলিকম ২য় শাখা",
      address: "নতুন বাজার রোড, কালিয়াকৈর, গাজীপুর",
      phone: "01700000000",
    };

    const text = generateInvoiceShareText(sampleInvoice, customShopSettings);

    expect(text).toContain("*রাশেদ টেলিকম ২য় শাখা*");
    expect(text).toContain("নতুন বাজার রোড, কালিয়াকৈর, গাজীপুর");
    expect(text).toContain("01700000000");
  });
});
