import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "রাশেদ টেলিকম — শপ ম্যানেজমেন্ট",
    short_name: "Rashed Telecom",
    description: "টেলিকম পণ্য বিক্রয়, মোবাইল সার্ভিসিং ও অ্যাকাউন্টিং পিডব্লিউএ (Telecom Sales & Mobile Servicing Management PWA)",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#2563eb",
    orientation: "portrait-primary",
    dir: "ltr",
    lang: "bn",
    categories: ["business", "finance", "productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.jpg",
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.jpg",
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "পিওএস টার্মিনাল (POS Terminal)",
        url: "/app/pos",
        description: "দ্রুত বিক্রয় ও ইনভয়েস প্রিন্ট",
        icons: [{ src: "/icons/icon-192.jpg", sizes: "192x192" }],
      },
      {
        name: "সার্ভিসিং জব (Mobile Servicing)",
        url: "/app/service",
        description: "মোবাইল মেরামত গ্রহণ ও স্ট্যাটাস আপডেট",
        icons: [{ src: "/icons/icon-192.jpg", sizes: "192x192" }],
      },
      {
        name: "পণ্য ও মজুত (Products & Stock)",
        url: "/app/products",
        description: "পণ্য তালিকা ও ইনভেন্টরি চেক",
        icons: [{ src: "/icons/icon-192.jpg", sizes: "192x192" }],
      },
    ],
  };
}
