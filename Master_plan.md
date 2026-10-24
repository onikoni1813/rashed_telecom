# Master Plan — Telecom + Mobile Servicing Shop Management PWA

**Document status:** Implementation baseline / scope freeze  
**Version:** 1.0.0  
**Primary audience:** Antigravity and other AI coding agents  
**Business context:** Bangladesh-based mobile phone, accessories, and repair shop  
**Currency:** BDT (৳)  
**Timezone:** `Asia/Dhaka`

---

## 1. Mission and Product Goal

Build a production-oriented, professional, installable Progressive Web App (PWA) for managing a telecom/mobile shop that sells mobile phones and accessories and performs mobile servicing.

The application must manage products, stock, purchases, sales, repair jobs, customers, suppliers, payments, customer dues, supplier payables, expenses, owner withdrawals, loans, staff permissions, reporting, audit history, and offline drafts.

This is not a static dashboard mockup. Business data must be persisted in PostgreSQL, business rules must be enforced on the server, and financial and stock changes must be atomic, auditable, and tested.

### Confirmed business decisions

- Shop operations: mobile phone sales, mobile servicing, and accessories.
- Users: approximately 2–5 people.
- Offline requirement: save drafts offline and synchronize when connectivity returns.
- Budget: use free or low-cost services where practical.
- Hosting: Vercel.
- App type: installable PWA.
- Database: PostgreSQL.
- Locale: Bengali and English-ready.
- Currency: BDT.
- Timezone: `Asia/Dhaka`.
- Development approach: build locally, use Git, and deploy through GitHub/Vercel when ready.

## 2. Non-Negotiable Engineering Principles

1. Inspect the existing repository before making changes.
2. Do not overwrite working code or replace architecture without explaining why.
3. Do not claim a feature, test, integration, backup, or deployment succeeded unless it was actually verified.
4. No production feature may rely on hard-coded mock data or static JSON instead of PostgreSQL.
5. Keep business logic in server-side domain/service modules, not in UI components.
6. Validate all inputs on the server; client-side validation is only for user experience.
7. Enforce authentication, shop membership, and permission checks on every protected server operation.
8. Treat the server and PostgreSQL as authoritative for stock, pricing, payment, and accounting.
9. Use database transactions for coupled changes such as sale + stock movement + payment + journal posting.
10. Use idempotency keys for retryable mutations and offline synchronization.
11. Never silently delete or overwrite posted financial transactions or stock history. Correct them through audited reversal/adjustment workflows.
12. Keep secrets out of source control and browser bundles.
13. Use strict TypeScript and maintain lint, typecheck, automated tests, and production-build scripts.
14. Every implementation phase must finish with a report of files changed, migrations, commands run, actual test results, known issues, and next prerequisites.

## 3. Fixed Technology Stack

Use this stack unless a documented blocker is identified before implementation:

- **Framework:** Next.js App Router + TypeScript strict mode.
- **UI:** Tailwind CSS + shadcn/ui.
- **Forms:** React Hook Form + Zod.
- **Database:** PostgreSQL.
- **ORM:** Prisma, with explicit SQL migrations where required.
- **Authentication:** Supabase Auth as the single identity provider for the baseline implementation.
- **Database hosting:** Supabase PostgreSQL initially, subject to current plan limits and backup requirements.
- **Client data fetching/cache:** TanStack Query where useful.
- **Tables:** TanStack Table.
- **Offline local drafts:** Dexie.js + IndexedDB.
- **Charts:** Recharts, only for real persisted data.
- **Testing:** Vitest, React Testing Library, Playwright.
- **PWA:** Web App Manifest, service worker, installability and safe caching.
- **Deployment:** Vercel.
- **Source control:** GitHub.

Do not add Auth.js alongside Supabase Auth. There must be one clearly defined identity provider. Validate the authenticated user on the server and verify shop membership for each protected operation.

Before relying on any free-tier feature, check current official provider documentation. Free-tier availability is not a guarantee of production uptime, backup retention, storage, or zero cost.

## 4. Architecture

### High-level request flow

1. PWA client renders the interface.
2. Online requests reach Next.js server-side Route Handlers or Server Actions.
3. Server validates identity, shop membership, permission, request schema, and business rules.
4. Domain service performs the operation.
5. PostgreSQL transaction persists related business records, ledger entries, and audit events.
6. Client receives a typed result and updates its view.
7. Offline drafts are stored in IndexedDB and later sent through an idempotent sync API.

### Architecture rules

- Route Handlers and Server Actions must call shared domain services; do not duplicate business logic.
- Keep authentication and permission checks server-side.
- Keep the general ledger and stock movement history as the authoritative audit trail.
- Cached stock balances may be used for performance but must be reconcilable against stock movements.
- Store repair images and attachments in private object storage; PostgreSQL stores metadata and storage keys, not public sensitive URLs.
- Do not treat Vercel function filesystem storage as permanent storage.
- Never represent an offline payment or sale as server-confirmed before successful server posting.

## 5. Project Structure

Use a feature-oriented structure similar to:

```text
telecom-shop-pwa/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
│   └── icons/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   ├── api/v1/
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── forms/
│   │   └── data-table/
│   ├── features/
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── inventory/
│   │   ├── purchases/
│   │   ├── sales/
│   │   ├── servicing/
│   │   ├── customers/
│   │   ├── suppliers/
│   │   ├── expenses/
│   │   ├── accounting/
│   │   ├── staff/
│   │   └── reports/
│   ├── lib/
│   │   ├── auth/
│   │   ├── db/
│   │   ├── permissions/
│   │   ├── validation/
│   │   ├── accounting/
│   │   ├── idempotency/
│   │   ├── audit/
│   │   └── errors/
│   ├── offline/
│   │   ├── db.ts
│   │   ├── outbox.ts
│   │   ├── sync-engine.ts
│   │   └── conflict-resolution.ts
│   └── types/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── package.json
└── README.md
```

The agent may adapt the exact structure to current Next.js conventions, but must preserve clear separation between UI, domain logic, database access, permissions, offline synchronization, and tests.

## 6. Core Data Model

Use UUID primary keys for business records. Every shop-owned record must include `shop_id` directly or have a demonstrably safe, enforced relationship to a shop-owned parent. Store timestamps in UTC and present them in `Asia/Dhaka`.

Common fields where applicable:

- `id`
- `shop_id`
- `created_at`
- `updated_at`
- `created_by`
- `version` for optimistic concurrency where needed
- `status` for records with a lifecycle

### 6.1 Shop, identity, roles and settings

- `shops`: name, currency, timezone, settings.
- `shop_members`: shop, authenticated user, role, active status.
- `roles`: shop-specific/system role names.
- `permissions`: permission key and description.
- `role_permissions`: role-to-permission relation.
- `staff_profiles`: employee code, joining date, compensation type, active status.
- `audit_logs`: actor, action, entity type/id, reason, safe before/after metadata.

### 6.2 Product catalogue

- `products`: SKU, barcode, name, category, brand, stock-tracking flag, active status.
- `product_variants`: product, variant name, attributes, unit.
- `categories`: name, parent, type.
- `product_prices`: product, price type, amount, validity dates if price history is required.
- `serial_numbers`: product, IMEI/serial, status, purchase source/reference.

Support mobile phones, accessories, replacement parts, and service-related consumables. IMEI-1/IMEI-2 and serial identifiers must be represented without accidentally treating two identifiers on one device as two physical devices. Enforce appropriate uniqueness within the relevant shop/product scope.

### 6.3 Inventory and purchasing

- `purchase_orders`
- `purchase_order_items`
- `goods_receipts`
- `goods_receipt_items`
- `stock_balances`
- `stock_movements`
- `stock_counts`
- `stock_count_items`
- `purchase_returns`
- `purchase_return_items`
- `locations` for the main shop stock location and future expansion

A purchase order does not increase on-hand stock until goods are received. Every stock mutation must create a stock movement in the same database transaction. `stock_balances` is a performance projection; `stock_movements` is the historical ledger.

### 6.4 Sales, payments and returns

- `sales`
- `sale_items`
- `sale_item_serials`
- `payments`
- `payment_allocations`
- `sales_returns`
- `sales_return_items`
- `cash_sessions`

A sale may use multiple payment methods. Payment allocations must preserve how each receipt is applied to a sale or other receivable. Do not rely only on a mutable `paid_amount` field as the entire payment history.

### 6.5 Repair servicing

- `service_jobs`
- `service_job_status_history`
- `service_diagnostics`
- `service_estimate_items`
- `service_parts`
- `service_labour`
- `service_payments` or a shared payment-allocation model
- `service_warranties`
- `service_attachments`

Track job number, customer, device brand/model, optional IMEI, reported issue, intake condition, accessories received, diagnosis, estimate, customer approval, technician, promised date, status history, parts used, labour, outside costs, payment, delivery and warranty.

Do not store device PINs or passwords as ordinary job fields. Attachments and repair photos must use private storage and controlled access.

### 6.6 Finance and accounting

- `accounts`: chart of accounts, code, name, type, parent, active.
- `journal_entries`: source type/id, entry date, status, description.
- `journal_lines`: account, debit, credit, optional customer/supplier dimensions.
- `expenses`: category, amount, date, payment account, status.
- `expense_categories`
- `financial_accounts`: cash, bank and supported MFS/cash accounts.
- `fund_transfers`
- `loans`
- `loan_transactions`
- `accounting_periods`
- `audit_logs`

Receivable/payable subledgers may have optimized balance projections, but they must reconcile with the general ledger.

### 6.7 System and offline sync

- `idempotency_keys`: shop, key, request hash, processing status and safe response metadata.
- `sync_operations`: operation ID, user, entity type/id, status and server version.
- `notifications`
- `recurring_bills`
- `attachments`
- `backup_logs` for backup job metadata where an actual backup process exists.

### 6.8 Database constraints

- Use PostgreSQL `NUMERIC` for money; serialize money to JSON as decimal strings.
- Define quantity precision intentionally; support fractional quantities only where appropriate.
- Enforce non-negative debit/credit values and prevent both sides of a journal line being positive at once.
- Every posted journal entry must balance: total debit equals total credit.
- Use unique constraints for invoice/job numbers, SKU and idempotency keys with correct scope.
- Use foreign keys and `RESTRICT` for historical records where deletion would break the audit trail.
- Add indexes for shop scope, dates, statuses, invoice/job numbers, product lookups and foreign keys.
- Use a database-level posting procedure or suitable deferred constraint trigger where necessary to enforce cross-row journal balance.
- Do not rely on application-only checks for critical financial invariants.

## 7. Accounting Contract

### 7.1 Starter chart of accounts

Suggested accounts (adapt and document the final chart):

| Code | Account | Type |
|---|---|---|
| 1000 | Cash on Hand | Asset |
| 1010 | Bank / MFS | Asset |
| 1100 | Accounts Receivable | Asset |
| 1200 | Inventory | Asset |
| 1300 | Supplier Advances | Asset |
| 1400 | Due from Owner | Asset |
| 2000 | Accounts Payable | Liability |
| 2100 | Customer Advances | Liability |
| 2200 | Loans Payable | Liability |
| 2300 | Salaries Payable | Liability |
| 3000 | Owner Capital | Equity |
| 3100 | Owner Drawings | Contra-equity |
| 4000 | Product Sales | Revenue |
| 4100 | Service Revenue | Revenue |
| 4200 | Other Operating Income | Revenue |
| 5000 | Cost of Goods Sold | Expense |
| 5100 | Direct Service Costs | Expense |
| 6000 | Rent & Utilities | Expense |
| 6100 | Salaries & Commissions | Expense |
| 6200 | Other Operating Expenses | Expense |
| 7000 | Interest Expense | Expense |

Add accounts for tax payable, returns, discounts, stock write-offs and other needs if relevant. Do not invent tax compliance rules; confirm local requirements before implementing statutory reports.

### 7.2 Posting examples

- Cash sale: Debit Cash; Credit Product Sales.
- Credit sale: Debit Accounts Receivable; Credit Product Sales.
- Cost of sold stock: Debit COGS; Credit Inventory.
- Credit purchase: Debit Inventory; Credit Accounts Payable.
- Supplier payment: Debit Accounts Payable; Credit Cash/Bank.
- Customer due collection: Debit Cash/Bank; Credit Accounts Receivable.
- Rent paid: Debit Rent Expense; Credit Cash/Bank.
- Owner capital injection: Debit Cash/Bank; Credit Owner Capital.
- Owner withdrawal: Debit Owner Drawings; Credit Cash/Bank.
- Loan principal repayment: Debit Loan Payable; Credit Cash/Bank; record interest separately as expense.
- Service payment: Debit Cash/Bank or Receivable; Credit Service Revenue.
- Service parts consumed: Debit Direct Service Costs; Credit Inventory, or use a documented alternative accounting policy.

Every posting must balance and be created atomically with its source transaction.

### 7.3 Mandatory accounting rules

1. A customer due collection is not new revenue.
2. A supplier payment is not a second purchase expense.
3. Owner personal withdrawal is not an operating expense.
4. Loan principal repayment is not interest expense.
5. Inventory purchases become COGS when sold or are expensed/written off according to the documented inventory policy.
6. Separate product revenue from service labour revenue to prevent double counting.
7. Posted transactions cannot be silently edited/deleted; use reversal and correction entries.
8. Closing an accounting period restricts backdated posting and requires an explicit controlled adjustment workflow.
9. Trial balance must balance.
10. Stock valuation, cash/bank balances, customer receivables, supplier payables and the general ledger must have reconciliation reports.
11. Reported sales, actual cash received, receivables, gross margin and net profit are different measures and must be labelled accurately.
12. Document the chosen inventory cost method (e.g. weighted average) and use it consistently. Do not mix cost methods silently.

### 7.4 Example service calculation

Example only:
- Service labour charge: ৳800
- Parts selling price: ৳350
- Parts cost: ৳250
- Direct labour cost: ৳150
- Outsourced cost: ৳100

Invoice total: ৳1,150. Direct costs: ৳500. Contribution before other overhead: ৳650.

If the parts are reported as product revenue and labour as service revenue, do not add the same parts revenue to service revenue again.

## 8. API Contract

All APIs use `/api/v1`. JSON requests and typed JSON responses are required. Use ISO 8601 timestamps and decimal strings for money.

### 8.1 Standard response

Success:

```json
{
  "data": {},
  "meta": { "requestId": "server-generated-id" }
}
```

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request is invalid.",
    "details": {},
    "requestId": "server-generated-id"
  }
}
```

Never expose stack traces, SQL details, secrets or sensitive payloads in production errors.

### 8.2 Route inventory

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/api/v1/dashboard` | `dashboard.view` |
| GET, POST | `/api/v1/products` | `products.view/create` |
| GET, PATCH | `/api/v1/products/:id` | `products.view/update` |
| GET | `/api/v1/inventory` | `inventory.view` |
| POST | `/api/v1/inventory/adjustments` | `inventory.adjust` |
| GET, POST | `/api/v1/purchases` | `purchases.view/create` |
| POST | `/api/v1/purchases/:id/receive` | `purchases.receive` |
| GET, POST | `/api/v1/sales` | `sales.view/create` |
| POST | `/api/v1/sales/:id/returns` | `sales.refund` |
| GET, POST | `/api/v1/service-jobs` | `service.view/create` |
| GET, PATCH | `/api/v1/service-jobs/:id` | `service.view/update` |
| POST | `/api/v1/service-jobs/:id/approve-estimate` | `service.approve_estimate` |
| POST | `/api/v1/service-jobs/:id/consume-parts` | `service.consume_parts` |
| POST | `/api/v1/service-jobs/:id/deliver` | `service.deliver` |
| GET, POST | `/api/v1/expenses` | `expenses.view/create` |
| GET | `/api/v1/accounts/ledger` | `accounts.view_ledger` |
| GET | `/api/v1/reports/profit-loss` | `reports.view_profit` |
| GET | `/api/v1/reports/stock-valuation` | `reports.view_stock` |
| POST | `/api/v1/sync/push` | `sync.push` |
| POST | `/api/v1/sync/pull` | `sync.pull` |

Add consistent customer, supplier, payment, due, staff, report, audit, settings, import/export and backup routes as their features are implemented.

### 8.3 Sale creation contract

`POST /api/v1/sales`

Require `Idempotency-Key` header and schema validation. Request fields may include customer ID, product IDs, quantities, selected serials, requested prices/discounts, payments, account IDs and notes.

The server must:
- Validate active shop membership and `sales.create`.
- Resolve authoritative prices or enforce a separate price-override permission.
- Validate stock and serial ownership.
- Validate actual payment/account data.
- Calculate totals server-side; never trust client totals.
- Atomically create sale, sale items, stock movements, payment allocations, balanced journal entries and audit event.
- Return server-generated sale ID, invoice number, status, total, paid amount and due amount.

The sample contract must not be treated as permission to trust client-supplied financial totals.

### 8.4 Repair job creation contract

`POST /api/v1/service-jobs`

Support customer ID, device brand/model, optional IMEI, intake condition, accessories received, reported issue, promised date and optional technician assignment.

Return server-generated job ID/number, status, creation time and version. Do not collect device PINs/passwords as ordinary job fields.

### 8.5 Offline sync contract

`POST /api/v1/sync/push`

Each operation includes:
- Unique `operationId`
- Entity type
- Schema version
- Optional base server version
- Draft payload

Possible results: `SYNCED`, `VALIDATION_FAILED`, `CONFLICT`, `RETRYABLE_ERROR`, `PERMISSION_DENIED`.

Rules:
- Repeated operation IDs return the original result where safe and do not duplicate mutations.
- Validate authentication, membership, permissions and business rules at sync time.
- Offline drafts remain drafts until server processing.
- Payments, final sales and stock adjustments cannot be marked confirmed before authoritative posting.
- Preserve outbox items until server acknowledgement.
- Do not overwrite conflicting data silently; present a conflict-resolution flow.

## 9. UI and Route Map

### Authentication
- `/login`
- `/forgot-password`

### Main app
- `/app` — dashboard
- `/app/pos` — point of sale
- `/app/sales`
- `/app/sales/[id]`
- `/app/sales/returns`
- `/app/products`
- `/app/products/new`
- `/app/products/[id]`
- `/app/inventory`
- `/app/inventory/movements`
- `/app/inventory/counts`
- `/app/purchases`
- `/app/purchases/[id]`
- `/app/service`
- `/app/service/new`
- `/app/service/[id]`
- `/app/customers`
- `/app/customers/[id]`
- `/app/suppliers`
- `/app/suppliers/[id]`
- `/app/expenses`
- `/app/accounts`
- `/app/accounts/ledger`
- `/app/dues`
- `/app/loans`
- `/app/staff`
- `/app/staff/[id]`
- `/app/reports`
- `/app/reports/profit-loss`
- `/app/reports/stock`
- `/app/reports/service`
- `/app/notifications`
- `/app/audit`
- `/app/settings`
- `/app/settings/users`
- `/app/settings/backup`
- `/app/sync`

### Navigation and responsive UX

Desktop: sidebar with Dashboard, POS, Products, Inventory, Purchases, Servicing, Customers, Suppliers, Accounts, Dues, Reports and Settings.

Mobile bottom navigation: Home, POS, Service, Inventory and More.

Every list/detail/form page must have loading, empty, error, validation, permission-denied and retry states as appropriate. Include search, filtering, pagination and accessible forms. Use professional, consistent spacing, typography, status badges, dialogs, tables, receipts and mobile-friendly touch targets. Do not fill production dashboards with invented metrics.

## 10. Offline Drafts and Sync

Use Dexie.js and IndexedDB for explicitly approved local drafts and an outbox. The server remains authoritative.

Suggested sync status:
- `LOCAL_ONLY`
- `PENDING`
- `SYNCING`
- `SYNCED`
- `CONFLICT`
- `FAILED`

Each draft stores an operation UUID, entity type, schema version, local ID, payload, timestamps, status, retry count and safe error summary.

Requirements:
1. Drafts persist across browser restarts.
2. Retry with bounded exponential backoff.
3. Preserve outbox items until acknowledgement.
4. Repeated sync does not create duplicates.
5. Validate price, stock, permissions and all business rules on the server.
6. Display offline, pending, syncing, synced, conflict and failed states.
7. Include cached-data freshness indicators.
8. Handle schema-version mismatch safely.
9. Avoid storing unnecessary sensitive customer information locally.
10. Define logout/shared-device behavior so user data is not exposed.
11. Do not promise full offline POS or guaranteed background sync on unsupported browsers.
12. Initial release should prioritize offline drafts plus online authoritative financial posting.

## 11. Security Requirements

- HTTPS in production.
- Server-side session/token validation.
- Server-side authorization on every protected mutation and read.
- Verify shop membership for every shop-scoped operation.
- Deny by default and follow least privilege.
- Do not trust client-provided shop IDs, prices, discounts, totals or permissions.
- Use secure session handling appropriate to the selected auth provider.
- Rate-limit login, password reset and sensitive endpoints.
- Keep database/service secrets on the server only.
- Enforce private attachment storage and short-lived signed access URLs.
- Validate upload MIME type, size and access policy.
- Redact secrets and personal data from logs.
- Audit stock adjustments, refunds, price overrides, purchase receiving, salary changes, journal posting and period closure.
- Require reasons for sensitive corrections.
- Use separate permissions for cost, profit, salary, financial export, refunds and inventory adjustments.
- Support MFA for the owner where the chosen provider supports it.
- Keep dependencies updated and document secret rotation/recovery.
- Never cascade-delete posted accounting or stock history.

## 12. Staff Roles and Permission Model

Provide a configurable role/permission model. Suggested starting roles:

- **Owner/Admin:** all shop operations, user management, accounting, settings, exports and audit.
- **Manager:** approved operational and reporting permissions; restricted owner-only settings.
- **Cashier/Sales:** POS, sales, allowed receipts and customer lookup; no default salary or profit access.
- **Technician:** assigned repair jobs, diagnosis, approved work, parts requests/consumption within policy and service history.
- **Accountant (optional role):** permitted expenses, due settlement, ledger and reports; no automatic access to user administration.

Permissions must be checked in server-side code, not merely by hiding UI buttons. Configure approval limits for discounts, refunds, stock adjustments, purchase receiving and sensitive finance operations. Decide whether maker-checker is required for each operation and prevent self-approval where policy requires it.

## 13. Reporting Requirements

Implement reports backed by persisted data:

- Daily/monthly sales and payment collections.
- Product/category sales and gross margin.
- Product-wise stock, stock valuation, low stock and stock movements.
- Purchase history and supplier balances.
- Repair queue, overdue jobs, turnaround time and technician workload.
- Service revenue, direct costs and contribution.
- Customer due aging and supplier payable aging.
- Cashbook by cash/bank/MFS account.
- Expense breakdown and recurring bill status.
- Profit and Loss, Trial Balance, Balance Sheet and Cash Flow after accounting definitions are validated.
- Salary/commission reports with restricted permissions.
- Refund, discount, adjustment and audit reports.

Include date range, relevant filters, pagination, print/export, clear metric definitions and permission checks. Sales, cash received, receivables and profit must never be treated as interchangeable values.

## 14. Backup, Recovery and Operational Readiness

- Configure a documented PostgreSQL backup approach appropriate to the selected plan.
- Back up attachment/object storage separately; database backups may not include object contents.
- Keep a backup copy separate from the primary database where practical.
- Document retention and recovery objectives.
- Test restoring a backup into a separate environment.
- Verify stock and ledger reconciliation after restore.
- Provide safe data export.
- Log backup job status only when a real job exists; do not create fake success statuses.
- Document recovery steps, account recovery and emergency staff-access revocation.
- Monitor production errors and avoid logging sensitive payloads.

## 15. Testing Strategy

### Unit tests
- Money calculations, discounts, quantity validation, account mapping, permission helpers and accounting calculations.

### Integration tests with PostgreSQL
- Sale + stock movement + payment + journal posting in one transaction.
- Purchase receipt and supplier payable.
- Repair parts consumption and cost posting.
- Customer payment allocation and due reduction.
- Returns, refunds, stock reversal and accounting reversal.
- Idempotency and concurrent mutation behavior.
- Journal balance and stock-ledger reconciliation.

### API tests
- Authentication, shop membership, role permissions, invalid payloads, duplicate requests, forbidden cross-shop IDs and safe error responses.

### E2E tests with Playwright
- Login and role-based navigation.
- Create product, receive purchase, make sale, print receipt.
- Create repair, approve estimate, consume parts, collect payment, deliver device.
- Record expense and owner withdrawal.
- View customer/supplier statements and reports.
- Offline draft, reconnect, sync acknowledgement and conflict handling.

### Security tests
- Unauthenticated access is rejected.
- Unauthorized refund/discount/adjustment is rejected.
- Cross-shop data access is blocked.
- No secret is included in client bundles or production error output.
- Private attachments require authorized access.

### Release gates
- Critical accounting tests pass.
- No unresolved critical/high security defects.
- Duplicate retries do not create duplicate postings.
- Production build, lint and typecheck pass.
- Database migrations apply cleanly.
- Backup restore is tested.
- Stock, payment, receivable/payable and ledger reconciliation pass.
- Offline draft and reconnect flows are tested on supported target browsers.
- Role permission matrix is tested.
- Known limitations are documented honestly.

## 16. Phase-by-Phase Build Plan

Do not attempt the entire system in one giant code-generation step. Implement phases in order and do not advance while a phase has unresolved critical acceptance failures.

### Phase 0 — Foundation
- Inspect repository.
- Set up Next.js, TypeScript, styling, shared UI shell, lint, typecheck, tests, environment validation and README.
- Create a production build.
- **Exit gate:** clean local startup, passing checks and documented setup.

### Phase 1 — Schema, auth and permissions
- Implement core Prisma schema, migrations, shop membership, roles, permissions, audit framework and seed data restricted to development/test.
- **Exit gate:** migrations work and cross-shop/unauthorized access tests pass.

### Phase 2 — Products, inventory and purchasing
- Product catalogue, variants, serial identifiers, suppliers, purchase orders, goods receiving, stock ledger, counts and returns.
- **Exit gate:** stock movement and balance reconciliation pass.

### Phase 3 — POS and payments
- Cart, pricing, serial selection, split payments, dues, receipts, returns/refunds and cashier sessions.
- **Exit gate:** complete sale posts stock, payment, receivable and balanced journal entries atomically.

### Phase 4 — Repair servicing
- Intake, diagnosis, estimate approval, technician assignment, parts/labour, payment, delivery and warranty.
- **Exit gate:** repair lifecycle and cost/revenue reconciliation pass.

### Phase 5 — Accounting and finance
- Chart of accounts, general ledger, expenses, cashbook, owner withdrawals, loans, dues, reports and accounting-period controls.
- **Exit gate:** trial balance and reconciliation tests pass.

### Phase 6 — Staff and operations
- Attendance/payroll/commission if approved, role management, approvals, notifications, import/export and audit search.
- **Exit gate:** role matrix and approval tests pass.

### Phase 7 — PWA and production readiness
- Manifest, service worker, offline drafts, outbox sync, conflict UI, backup/restore, deployment configuration, monitoring and E2E tests.
- **Exit gate:** supported browser tests, critical E2E tests and restore verification pass.

## 17. Prompts for Antigravity

Run one phase prompt at a time. First provide the agent with this master plan, then use the appropriate phase prompt below. The agent must read this file before each phase and follow it as the source of truth.

### Phase 0 prompt — Initialize project

> Read `Master_plan.md` fully before changing any code. Inspect the current repository and preserve existing working code. Implement Phase 0 only: Next.js App Router, TypeScript strict mode, Tailwind CSS, shadcn/ui, shared responsive app shell, Bengali/English-ready structure, environment validation, typed error handling, lint/typecheck/test/build scripts, Prisma scaffolding, README and `.env.example` containing placeholders only. Do not build fake dashboard data or skip tests. Run the actual checks available and report exact results, changed files, blockers and next steps. Do not claim deployment or integration success unless verified. Stop after Phase 0.

### Phase 1 prompt — Schema, authentication and permissions

> Read `Master_plan.md` and inspect the repository. Implement Phase 1 only: PostgreSQL/Prisma schema, migrations, Supabase Auth integration, shop membership, roles, permissions, server-side guards, audit foundation, idempotency foundation and safe development/test seeds. Enforce shop scope and least privilege on all protected operations. Add tests for unauthenticated access, unauthorized mutations and cross-shop access. Run migrations against a test database if available; if credentials are unavailable, state exactly what could not be verified. Report changed files, migration status and test results. Stop after Phase 1.

### Phase 2 prompt — Inventory and purchasing

> Read `Master_plan.md`. Implement Phase 2 only: products, categories, variants, barcode/SKU, serial/IMEI identifiers, suppliers, purchase orders, goods receipts, purchase returns, stock movements, stock balances, stock counts and adjustments. All stock mutations must be server-authorized and atomic. Use stock movements as the historical ledger and add reconciliation tests. Do not add fake production data. Run unit, integration and type checks; report any unverified tests. Stop after Phase 2.

### Phase 3 prompt — POS and payments

> Read `Master_plan.md`. Implement Phase 3 only: POS, server-authoritative pricing, cart, serial selection, discounts with permissions, cash/bank/MFS payments, split payments, customer dues, invoice/receipt printing, returns/refunds and cashier sessions. Implement idempotent sale posting in a database transaction covering sale records, stock movements, payment allocations, balanced journal entries and audit events. Do not trust client totals. Test concurrent sales, duplicate requests, insufficient stock, mixed payment, refunds and rollback. Stop after Phase 3.

### Phase 4 prompt — Repair servicing

> Read `Master_plan.md`. Implement Phase 4 only: repair intake, job numbers, device condition/accessories, diagnosis, estimates, customer approval, technician assignment, status history, parts consumption, labour, outside costs, payments, delivery, warranty and private attachments. Do not store device passwords/PINs. Validate state transitions and post parts/financial effects atomically. Test the full repair lifecycle and reconciliation. Stop after Phase 4.

### Phase 5 prompt — Accounting and finance

> Read `Master_plan.md`. Implement Phase 5 only: chart of accounts, balanced double-entry journal, cashbook, expenses, recurring bills, owner capital/drawings, loans, customer receivables, supplier payables, accounting-period controls, P&L, Trial Balance, Balance Sheet, Cash Flow and reconciliation reports. Enforce the documented rules: due collection is not new revenue, supplier payment is not a second purchase expense, owner drawings are not operating expenses, and loan principal is not interest. Use reversal workflows for posted corrections. Add extensive accounting tests. Stop after Phase 5.

### Phase 6 prompt — Staff and operations

> Read `Master_plan.md`. Implement Phase 6 only: staff profiles, approved attendance/payroll/commission features, permission administration, maker-checker workflows, customer/supplier statements, notifications, audit search, imports and exports. Enforce permissions server-side, restrict salary/profit access, validate imports and audit sensitive changes. Test role and approval matrices. Stop after Phase 6.

### Phase 7 prompt — PWA, offline sync and release

> Read `Master_plan.md`. Implement Phase 7 only: installable PWA, service worker, safe asset caching, Dexie/IndexedDB drafts, idempotent sync outbox, bounded retry, schema-version handling, conflict UI, offline status, private file storage, production environment checks, backup/restore documentation and Playwright E2E tests. Offline financial operations must not be presented as server-confirmed. Verify target-browser behavior rather than assuming support. Run build, lint, typecheck, tests and restore/reconciliation checks where environments permit. Report exact results and limitations; do not claim deployment unless actually completed.

## 18. Required Phase Completion Report

At the end of each phase, the coding agent must return:

1. Phase and scope completed.
2. Files created/modified.
3. Database migrations and schema changes.
4. Commands executed.
5. Actual results for lint, typecheck, unit, integration, E2E and build.
6. Business rules implemented.
7. Security considerations and permission coverage.
8. Known bugs, incomplete work and unverified assumptions.
9. Manual steps requiring the user, such as provider account setup or environment variables.
10. Exact next phase and prerequisites.

Do not mark a phase complete if its critical acceptance criteria fail.

## 19. Official Documentation to Consult

Use current official documentation rather than outdated snippets:

- Next.js: https://nextjs.org/docs/app
- Prisma: https://www.prisma.io/docs
- Supabase: https://supabase.com/docs
- Vercel: https://vercel.com/docs
- Vercel pricing: https://vercel.com/pricing
- Supabase pricing: https://supabase.com/pricing
- GitHub pricing: https://github.com/pricing
- MDN PWA guides: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
- Playwright: https://playwright.dev/docs/intro
- Vitest: https://vitest.dev/guide/
- Dexie.js: https://dexie.org/docs/

## 20. Final Definition of Done

The project is not production-ready merely because the UI looks polished or the app builds.

Release requires:
- Products, purchases, inventory, POS, payments, dues, repairs, expenses and reports work with persisted PostgreSQL data.
- Every critical financial event creates balanced journal entries.
- Every stock change is traceable through stock movements.
- Sales, returns, purchase receipts and repair parts consumption are transactional and idempotent.
- Role permissions are enforced on the server.
- Offline drafts survive restart and sync safely without duplicate operations.
- Critical tests pass and security issues are resolved.
- Backup/restore has been tested and ledgers reconciled.
- Production configuration and known limitations are documented.
- No fake success messages, fake reports, placeholder business logic or unverified deployment claims remain.

**Priority:** Correct accounting and stock > security and data integrity > complete workflows > offline reliability > visual polish > optional advanced features.
