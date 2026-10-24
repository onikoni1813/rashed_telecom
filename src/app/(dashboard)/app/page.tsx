import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingCart,
  Wrench,
  Package,
  Receipt,
  ShieldCheck,
  Database,
  Globe2,
  Cpu,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome / Shop Banner */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-primary/20 shadow-md bg-background shrink-0">
              <Image
                src="/invoice_logo.jpg"
                alt="Rashed Telecom"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  রাশেদ টেলিকম (Rashed Telecom)
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  Phase 0
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Telecom, Accessories & Mobile Servicing Management System
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Currency: BDT (৳)</span>
                <span>•</span>
                <span className="font-medium text-foreground">Timezone: Asia/Dhaka</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Local App Shell Online</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              href="/app/pos"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-xs hover:bg-primary/90 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>POS বিক্রয় কেন্দ্র</span>
            </Link>
            <Link
              href="/app/service"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border bg-background text-foreground font-semibold text-sm hover:bg-muted transition-colors"
            >
              <Wrench className="w-4 h-4" />
              <span>সার্ভিসিং গ্রহণ</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Operational Readiness Verification Grid */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          সিস্টেম রেডিনেস ও স্ট্যাটাস (System Foundation Status)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border bg-card shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Database Schema</span>
              <Database className="w-4 h-4 text-primary" />
            </div>
            <div className="text-base font-bold text-foreground">Prisma PostgreSQL</div>
            <p className="text-xs text-muted-foreground">
              Scaffolding configured for authoritative double-entry ledger & stock movements.
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-card shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Localization</span>
              <Globe2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-base font-bold text-foreground">বাংলা & English</div>
            <p className="text-xs text-muted-foreground">
              Full dictionary & BDT (৳) currency formatting with Asia/Dhaka timezone support.
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-card shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Error Architecture</span>
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-base font-bold text-foreground">Typed API Contract</div>
            <p className="text-xs text-muted-foreground">
              Strict error formatting preventing sensitive SQL or secrets leakage.
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-card shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Client Runtime</span>
              <Cpu className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-base font-bold text-foreground">Next.js App Router</div>
            <p className="text-xs text-muted-foreground">
              TypeScript strict mode, Tailwind CSS styling, and responsive layout.
            </p>
          </div>
        </div>
      </div>

      {/* Operational Empty States (No fake/mock figures) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm text-foreground">সাম্প্রতিক বিক্রয় (Recent Sales)</h3>
            </div>
            <span className="text-xs text-muted-foreground">Live Data Only</span>
          </div>
          <div className="py-10 text-center space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              কোন সক্রিয় বিক্রয় রেকর্ড পাওয়া যায়নি।
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Production requirement: No mock metrics are displayed. Actual transactions will be recorded upon completion of Phase 1 (Database) and Phase 3 (POS).
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-sm text-foreground">সার্ভিসিং কিউ (Servicing Queue)</h3>
            </div>
            <span className="text-xs text-muted-foreground">Live Data Only</span>
          </div>
          <div className="py-10 text-center space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              বর্তমানে কোন মেরামতের কাজ অপেক্ষমান নেই।
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Real-time service queue tracking, IMEI intake, and technician assignment will be enabled in Phase 4.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
