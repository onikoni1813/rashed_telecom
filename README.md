# Rashed Telecom — Telecom + Mobile Servicing Shop Management PWA

A production-grade Progressive Web App (PWA) engineered for managing telecom retail, mobile accessories sales, and mobile device servicing operations in Bangladesh.

**Currency:** BDT (৳)  
**Timezone:** `Asia/Dhaka`  
**Primary Source of Truth:** [`Master_plan.md`](./Master_plan.md)

---

## 1. Architecture & Technology Stack

- **Framework:** Next.js 15 (App Router) + TypeScript Strict Mode
- **Styling:** Tailwind CSS + Radix/shadcn design token architecture
- **Database:** PostgreSQL (Authoritative double-entry general ledger & stock movement history)
- **ORM:** Prisma Client with explicit migrations
- **Authentication:** Supabase Auth (Single identity provider)
- **Testing:** Vitest + React Testing Library + Playwright
- **Offline Drafts:** Dexie.js (IndexedDB local outbox for drafts with authoritative server-side posting)

---

## 2. Directory Structure

```text
telecom-shop-pwa/
├── prisma/               # Prisma database schema and migration scripts
├── public/               # Static assets, branding, and PWA icons
│   ├── favicon.ico
│   ├── invoice_logo.jpg
│   └── icons/
├── src/
│   ├── app/              # Next.js App Router pages and API routes
│   │   ├── (auth)/       # Authentication route group
│   │   ├── (dashboard)/  # Main authenticated app layout & views
│   │   ├── api/v1/       # Authoritative API endpoints
│   │   ├── globals.css   # Tailored theme tokens & base styles
│   │   └── layout.tsx    # Root layout & PWA viewport settings
│   ├── components/       # Shared UI components and layouts
│   │   ├── layout/       # Sidebar, Topbar, MobileNav, AppShell
│   │   └── ui/           # Atomic UI elements
│   ├── features/         # Feature domain modules (POS, Inventory, Servicing, Accounts)
│   ├── lib/              # Core libraries
│   │   ├── accounting/   # Chart of Accounts and posting rules
│   │   ├── audit/        # Audit trail logging helpers
│   │   ├── auth/         # Supabase identity provider helpers
│   │   ├── db/           # Prisma client singleton
│   │   ├── errors/       # Authoritative typed error classes & response formatter
│   │   ├── i18n/         # Bengali & English dictionaries and formatters (BDT, Dhaka Time)
│   │   ├── idempotency/  # Idempotent mutation handling
│   │   ├── permissions/  # Role & permission enforcement
│   │   └── validation/   # Zod schema environment validation
│   ├── offline/          # Offline drafts & outbox sync engine stubs
│   └── types/            # Authoritative TypeScript types & API envelopes
└── tests/
    └── unit/             # Unit tests for formatters, error handling, validation
```

---

## 3. Getting Started

### Prerequisites
- Node.js `v20.x` or later (tested on Node `v24.19.0`)
- npm `v10.x` or later

### Installation
1. Clone the repository and navigate to the project directory:
   ```bash
   cd "Rashed Telecom"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
4. Copy the environment configuration:
   ```bash
   cp .env.example .env.local
   ```
5. Update `.env.local` with your PostgreSQL database credentials and Supabase credentials.

---

## 4. Verification and Development Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Launch local development server at `http://localhost:3000` |
| `npm run build` | Validate and build the production bundle |
| `npm run typecheck` | Run TypeScript compiler strict type checking (`tsc --noEmit`) |
| `npm run lint` | Run Next.js and ESLint code quality checks |
| `npm run test` | Run Vitest unit tests |
| `npm run prisma:generate` | Regenerate Prisma Client types from `prisma/schema.prisma` |

---

## 5. Implementation Status

- [x] **Phase 0 — Foundation**: Next.js App Router, TypeScript strict mode, Tailwind CSS tokens, responsive App Shell (Sidebar, Topbar, Mobile Nav), Bengali/English-ready architecture, BDT formatting, Dhaka timezone helpers, typed error handling, environment validation, Prisma schema scaffolding, test suite, and clean production build.
- [ ] **Phase 1 — Schema, Auth and Permissions**: PostgreSQL/Prisma models, Supabase Auth integration, shop membership, roles, and server-side permission guards.
- [ ] **Phase 2 — Products, Inventory and Purchasing**: Product catalogue, variants, serial/IMEI tracking, stock ledger movements, purchase orders, and goods receiving.
- [ ] **Phase 3 — POS and Payments**: Point of Sale cart, split payments, receipts, returns, customer dues, and transactional posting.
- [ ] **Phase 4 — Repair Servicing**: Device intake, diagnostics, estimates, parts consumption, technician assignment, and delivery.
- [ ] **Phase 5 — Accounting and Finance**: Double-entry journal, general ledger, cashbook, expense tracking, and financial reconciliation.
- [ ] **Phase 6 — Staff and Operations**: Profiles, permissions, approvals, customer/supplier statements, and audit logging.
- [ ] **Phase 7 — PWA and Production Readiness**: Service worker, offline drafts, IndexedDB outbox sync, and E2E tests.
