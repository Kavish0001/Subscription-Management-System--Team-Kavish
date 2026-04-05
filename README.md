# Veltrix

Veltrix is a full-stack **subscription management platform** for recurring billing businesses. It combines an admin backoffice, a customer-facing portal, subscription lifecycle workflows, invoicing, taxes, discounts, **Razorpay payment integration**, transactional emails, and reporting — all in a single scalable TypeScript monorepo.

> Built for the Subscription Management System hackathon problem statement, structured like a production-grade modular monolith.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Repo Map](#repo-map)
- [Backend Modules](#backend-modules)
- [Frontend Routes](#frontend-routes)
- [Payment Integration (Razorpay)](#payment-integration-razorpay)
- [Email Integration](#email-integration)
- [Database](#database)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Testing & Quality](#testing--quality)
- [CI/CD](#cicd)

---

## Features

### Authentication & Users
- Signup with **OTP-based email verification**
- Login, logout, JWT access + refresh token rotation
- Password reset via email link
- Role-based access control: `admin`, `internal_user`, `portal_user`
- User management with invite, activate, and deactivate flows

### Admin Backoffice
- **Dashboard** with KPI summary (revenue, subscriptions, invoices, overdue)
- **Products**: full CRUD, categories, variants, attributes, images, plan pricing
- **Recurring Plans**: interval-based billing (day/week/month/year), min qty, auto-close, pause/renew flags
- **Quotation Templates**: pre-built order templates with line items and payment terms
- **Discounts**: fixed/percentage rules, scope (all products / selected / subscriptions), usage limits
- **Taxes**: rate-based tax rules, inclusive/exclusive, per-product assignment
- **Subscriptions**: create, send quotation, confirm, activate, pause, close, cancel, renew, upsell
- **Contacts**: CRM-style contact + address management with user linking
- **Users**: admin panel for managing staff and portal accounts, role changes
- **Reports**: revenue, subscription state distribution, overdue invoices, monthly trends

### Customer Portal
- Product catalog with filtering and search
- Product detail with variant selection and plan picker
- Cart with persistent state (Zustand)
- Checkout flow: address selection → Razorpay payment → success confirmation
- Account: profile, order history, order detail, invoice download (PDF)
- Subscription preview page for quotations shared by sales team

### Billing & Subscription Lifecycle
- Multi-status subscription flow: `draft → quotation_sent → confirmed → active → paused → closed / cancelled`
- Automated invoice generation on subscription confirmation and renewal
- Invoice state machine: `draft → confirmed → paid / cancelled`
- Razorpay order creation and **cryptographic signature verification** on payment capture
- Subscription renewal and upsell with parent/child order tracking
- Pricng engine: plan-level price overrides, discount application, tax calculation

### Configuration (Admin)
- Payment terms management
- Quotation template setup
- Product attribute definitions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict) |
| Package Manager | pnpm workspaces |
| API | Express 5, Zod, Prisma ORM |
| Frontend | Vite, React 19, React Router 7, Tailwind CSS 4, TanStack Query |
| Auth | JWT (access + refresh), Argon2 password hashing |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7, BullMQ |
| Payments | **Razorpay** (order creation + HMAC signature verification) |
| Email | Nodemailer (SMTP / MailHog for local dev) |
| PDF | Client-side PDF generation for invoices and orders |
| Testing | Vitest |
| Linting | ESLint, Prettier, Husky, lint-staged |
| CI/CD | GitHub Actions |
| Infra (local) | Docker Compose (Postgres, Redis, MailHog) |

---

## Architecture

### System Diagram
```mermaid
flowchart LR
    User[Portal User] --> Web[apps/web - Vite React + Tailwind]
    Staff[Admin / Internal User] --> Web

    Web --> API[apps/api - Express REST API]
    API --> DB[(PostgreSQL)]
    API --> Redis[(Redis)]
    API --> Razorpay[Razorpay API]
    API --> SMTP[SMTP / MailHog]
    API --> Shared[packages/shared]
    Worker[apps/worker - BullMQ Worker] --> Redis
    Worker --> API

    API --> Prisma[Prisma ORM]
    Prisma --> DB
```

### Business Workflow
```mermaid
flowchart TD
    A[Admin seeds system] --> B[Create products & plans]
    B --> C[Create taxes, discounts & quotation templates]

    F[Portal user signup] --> G[OTP email verification]
    G --> H[Browse product catalog]
    H --> I[Select product + recurring plan]
    I --> J[Add to cart]
    J --> K[Checkout: address]
    K --> L[Checkout: Razorpay payment]
    L --> M{Payment verified?}
    M -->|Yes| N[Subscription created & active]
    M -->|No| O[Payment failed screen]
    N --> P[Invoice auto-generated & marked paid]

    Q[Backoffice creates subscription] --> R[Draft subscription]
    R --> S{Next action}
    S -->|Send quotation| T[Quotation sent to portal user]
    S -->|Direct confirm| U[Confirmed]
    T --> U
    U --> V[Invoice generated]
    V --> W[Razorpay payment or manual mark paid]
    W --> N
    N --> X[Renew or upsell subscription]
```

### Database Relationship Summary
```mermaid
erDiagram
    USERS ||--o{ CONTACTS : owns
    CONTACTS ||--o{ ADDRESSES : has
    PRODUCT_CATEGORIES ||--o{ PRODUCTS : groups
    PRODUCTS ||--o{ PRODUCT_VARIANTS : has
    PRODUCT_ATTRIBUTES ||--o{ PRODUCT_ATTRIBUTE_VALUES : has
    PRODUCTS ||--o{ PRODUCT_PLAN_PRICING : priced_with
    RECURRING_PLANS ||--o{ PRODUCT_PLAN_PRICING : applies_to
    QUOTATION_TEMPLATES ||--o{ QUOTATION_TEMPLATE_LINES : contains
    CONTACTS ||--o{ SUBSCRIPTION_ORDERS : places
    USERS ||--o{ SUBSCRIPTION_ORDERS : manages
    SUBSCRIPTION_ORDERS ||--o{ SUBSCRIPTION_ORDER_LINES : has
    SUBSCRIPTION_ORDERS ||--o{ INVOICES : generates
    INVOICES ||--o{ INVOICE_LINES : has
    INVOICES ||--o{ PAYMENTS : settled_by
```

---

## Repo Map

```text
.
|- apps/
|  |- api/               Express API, Prisma schema, business modules, tests
|  |  |- prisma/         Schema, migrations, seed
|  |  |- src/
|  |     |- config/      Environment config (Zod-validated)
|  |     |- lib/         Prisma client, error classes, logger, mailer, Razorpay helpers
|  |     |- middleware/   Auth guard, error handler
|  |     |- modules/
|  |        |- auth/             Login, signup, OTP, refresh, password reset
|  |        |- users/            User CRUD, role management
|  |        |- contacts/         Contact and address management
|  |        |- catalog/          Products, categories, attributes, variants, plans, discounts
|  |        |- billing/          Invoices, payments, Razorpay order + verify, checkout
|  |        |- subscriptions/    Subscription lifecycle, pricing engine, renewal/upsell
|  |        |- taxes/            Tax rule CRUD
|  |        |- configuration/    Payment terms, quotation templates
|  |        |- reports/          Dashboard KPIs and analytics
|  |     |- routes/      Root API router
|  |- web/               Vite React frontend, admin + portal routes, Tailwind UI
|  |  |- src/
|  |     |- app/         Router setup, query/session providers
|  |     |- components/  Shared layout, icons
|  |     |- features/
|  |        |- admin/    Dashboard, products, users, subscriptions, contacts, reports, config
|  |        |- auth/     Login, signup, OTP verify, password reset
|  |        |- portal/   Home, shop, cart, checkout, account, PDF generation
|  |     |- lib/         API client, session state, cart state, Razorpay loader, PDF utils
|  |- worker/            BullMQ worker, background job execution
|- packages/
|  |- shared/            Shared enums, Zod schemas, DTOs, cross-app contracts
|- infra/
|  |- docker/            Local Postgres + Redis + MailHog stack
|- docs/
|  |- architecture.md
|- .github/
|  |- workflows/         CI/CD pipelines (ci.yml, cd.yml)
```

---

## Backend Modules

API is mounted under `/api/v1`:

| Route | Description |
|---|---|
| `GET /health` | Health check with uptime and timestamp |
| `/auth` | Login, signup, OTP verify, refresh, logout, password reset |
| `/users` | User CRUD, role management, activate/deactivate |
| `/contacts` | Contact + address management |
| `/categories` | Product category CRUD |
| `/products` | Product CRUD with variants, attributes, plan pricing |
| `/attributes` | Product attribute definitions |
| `/recurring-plans` | Recurring plan CRUD |
| `/quotation-templates` | Quotation template CRUD with line items |
| `/payment-terms` | Payment term configuration |
| `/discounts` | Discount rule CRUD |
| `/taxes` | Tax rule CRUD |
| `/subscriptions` | Full subscription lifecycle endpoints |
| `/invoices` | Invoice management and state transitions |
| `/payments/razorpay/create-order` | Create Razorpay order for an invoice |
| `/payments/razorpay/verify` | Verify Razorpay payment signature and mark invoice paid |
| `/payments/mock` | Mock payment (for testing without real Razorpay credentials) |
| `/checkout/complete` | Portal checkout completion endpoint |
| `/reports/dashboard` | Dashboard KPI and analytics data |

---

## Frontend Routes

### Portal (public + authenticated)
| Route | Description |
|---|---|
| `/` | Home / landing page |
| `/shop` | Product catalog with filtering |
| `/products/:slug` | Product detail with plan selection |
| `/cart` | Shopping cart |
| `/checkout/address` | Address selection (authenticated) |
| `/checkout/payment` | Razorpay payment flow (authenticated) |
| `/checkout/success` | Post-payment confirmation (authenticated) |
| `/preview/subscriptions/:id` | Quotation preview for portal users |
| `/account/profile` | User profile and address management |
| `/account/orders` | Order/subscription history |
| `/account/orders/:id` | Order detail with PDF export |
| `/account/invoices/:id` | Invoice detail with PDF export |

### Auth
| Route | Description |
|---|---|
| `/login` | Login page |
| `/signup` | Signup page |
| `/verify-otp` | OTP email verification after signup |
| `/reset-password` | Password reset (via emailed link) |

### Admin (role-protected)
| Route | Description |
|---|---|
| `/admin` | Dashboard with KPIs |
| `/admin/subscriptions` | Subscription list with status filters |
| `/admin/subscriptions/new` | Create subscription form |
| `/admin/products` | Product list |
| `/admin/products/new` | Create product |
| `/admin/products/:id` | View product |
| `/admin/products/:id/edit` | Edit product |
| `/admin/recurring-plans` | Recurring plans management |
| `/admin/attributes` | Product attributes management |
| `/admin/quotation-templates` | Quotation templates management |
| `/admin/payment-terms` | Payment terms configuration |
| `/admin/taxes` | Tax rules management |
| `/admin/discounts` | Discount rules management |
| `/admin/reports` | Analytics and reporting |
| `/admin/users` | All users + contacts |
| `/admin/users/:id` | User detail and contact info |
| `/admin/contacts/:id` | Contact detail |

---

## Payment Integration (Razorpay)

Veltrix uses **Razorpay** as the payment gateway for both portal checkout and admin-triggered invoice payments.

### How it works

1. **Order Creation**: When the user proceeds to pay, the frontend calls `POST /payments/razorpay/create-order` with the invoice ID. The API creates a Razorpay order via the Razorpay REST API using the configured key/secret and returns `{ orderId, amount, currency, keyId }`.

2. **Frontend Checkout**: The web app dynamically loads the Razorpay Checkout.js SDK and opens the payment modal pre-filled with customer details, amount, and merchant branding.

3. **Signature Verification**: On payment success, Razorpay returns `{ razorpay_payment_id, razorpay_order_id, razorpay_signature }`. The frontend sends these to `POST /payments/razorpay/verify`. The API verifies the HMAC-SHA256 signature using `crypto.timingSafeEqual` to prevent timing attacks.

4. **Invoice Settlement**: On successful verification, the invoice is marked `paid`, the payment record is created, and the associated subscription is set to `active`.

### Configuration

Set these in `apps/api/.env`:

```env
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

> Use `rzp_test_*` keys for development. Get your keys from the [Razorpay Dashboard](https://dashboard.razorpay.com/).

> For local testing without Razorpay credentials, use `POST /payments/mock` to simulate a payment completion.

---

## Email Integration

Veltrix sends transactional emails using **Nodemailer** over SMTP. In local development, emails are captured by **MailHog** (no real sends).

### Email flows implemented
- **OTP Verification** — sent on signup, 10-minute expiry
- **Password Reset** — sent with a tokenized reset link, 1-hour expiry

### Configuration

Set these in `apps/api/.env`:

```env
MAIL_FROM=no-reply@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
```

> For local development, leave `SMTP_HOST=localhost` and `SMTP_PORT=1025` to route to MailHog. View emails at `http://localhost:8025`.

---

## Database

The Prisma schema models the full subscription domain:

| Model | Purpose |
|---|---|
| `User` | Platform users (admin, internal, portal) |
| `Contact` | Customer CRM records linked to users |
| `Address` | Billing/shipping addresses |
| `ProductCategory` | Product groupings |
| `Product` | Goods and services for sale |
| `ProductAttribute` / `ProductAttributeValue` | Configurable product options |
| `ProductVariant` | Product variants from attribute combinations |
| `RecurringPlan` | Billing intervals and pricing rules |
| `ProductPlanPricing` | Plan-specific price overrides per product |
| `QuotationTemplate` | Pre-built order templates for sales |
| `QuotationTemplateLine` | Line items in a quotation template |
| `DiscountRule` | Fixed or percentage discount rules |
| `TaxRule` | Tax rate rules per product |
| `SubscriptionOrder` | The core subscription entity |
| `SubscriptionOrderLine` | Products and quantities in a subscription |
| `Invoice` | Billing documents generated per period |
| `InvoiceLine` | Line items on an invoice |
| `Payment` | Payment records with Razorpay transaction IDs |
| `RefreshToken` | Revocable JWT refresh tokens |
| `Job` | Background job tracking |
| `Notification` | Email/SMS notification log |
| `AuditLog` | Immutable audit trail for all actions |

**Migrations** in `apps/api/prisma/migrations/`:
- `0001_init` — full schema bootstrap
- `0002_product_images` — adds image URL arrays to products
- `20260404_add_verification_fields` — OTP email verification fields
- `20260405_configuration_payment_terms` — payment terms table
- `20260405_configuration_sketch_rules` — quotation template configuration
- `20260405_subscription_lifecycle` — subscription status and lifecycle fields
- `20260405_subscription_status_backfill` — data migration for status field
- `20260405_user_contact_links` — user-contact relationship improvements

---

## Local Development

### Prerequisites
- **Node.js 20+ (64-bit)** — required for native modules (Prisma engine, Argon2, lightningcss)
- **pnpm** — install via `npm install -g pnpm` or `winget install pnpm.pnpm`
- **Docker Desktop** — for Postgres, Redis, MailHog

### 1. Install dependencies

```bash
pnpm install
```

If `pnpm` is not available globally:

```bash
npm exec --yes pnpm@10.11.0 install
```

### 2. Copy environment files

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/worker/.env.example apps/worker/.env
```

Edit `apps/api/.env` and fill in your real Razorpay keys and SMTP credentials.

### 3. Start local infrastructure

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

This starts:
- PostgreSQL on port `5432`
- Redis on port `6379`
- MailHog SMTP on port `1025`, web UI on port `8025`

### 4. Database setup

```bash
pnpm --filter @subscription/api run prisma:generate
pnpm --filter @subscription/api run prisma:migrate
pnpm --filter @subscription/api run prisma:seed
```

### 5. Run all apps

```bash
pnpm dev
```

| Service | URL |
|---|---|
| Web Portal | http://localhost:5173 |
| Admin Panel | http://localhost:5173/admin |
| API | http://localhost:4000/api/v1 |
| MailHog UI | http://localhost:8025 |

### Default seed credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `Admin@1234` |

---

## Environment Variables

### `apps/api/.env`

```env
PORT=4000
APP_URL=http://localhost:5173

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/subscription_db?schema=public
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@1234
ADMIN_NAME=System Admin

# Email (use MailHog for local dev)
MAIL_FROM=no-reply@example.com
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_SECURE=false

# Razorpay payment gateway
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

### `apps/web/.env`

```env
VITE_API_URL=/api/v1
```

---

## Scripts

### Root workspace
```bash
pnpm dev          # Start all apps in parallel
pnpm build        # Build all apps
pnpm lint         # Lint all packages
pnpm typecheck    # TypeScript check all packages
pnpm test         # Run all tests
pnpm format       # Prettier format
```

### API (`apps/api`)
```bash
pnpm --filter @subscription/api dev
pnpm --filter @subscription/api run prisma:generate
pnpm --filter @subscription/api run prisma:migrate
pnpm --filter @subscription/api run prisma:seed
pnpm --filter @subscription/api run prisma:validate
pnpm --filter @subscription/api test
```

### Web (`apps/web`)
```bash
pnpm --filter @subscription/web dev
pnpm --filter @subscription/web build
pnpm --filter @subscription/web test
```

### Worker (`apps/worker`)
```bash
pnpm --filter @subscription/worker dev
```

---

## Testing & Quality

| Tool | Purpose |
|---|---|
| Vitest | Unit and integration tests |
| ESLint | Code linting |
| Prettier | Code formatting |
| TypeScript strict | Type safety (no `any`, strict null checks) |
| Husky + lint-staged | Pre-commit checks |
| Supertest | API route testing |

Run all checks:
```bash
pnpm lint && pnpm typecheck && pnpm test
```

---

## CI/CD

### `ci.yml` — triggered on pull requests and pushes to `main`
- Install dependencies
- Generate Prisma client
- Lint
- TypeCheck
- Test
- Validate Prisma schema
- Build

### `cd.yml` — triggered on push to `main` or manual dispatch
- All CI checks
- Build Docker image for `apps/api`
- Build Docker image for `apps/worker`
- Upload compiled artifacts for `apps/web`, `apps/api`, `apps/worker`

---

## Shared Package

`packages/shared` provides a single source of truth for:
- **Enums**: `UserRole`, `SubscriptionStatus`, `InvoiceStatus`, `PaymentStatus`, `ProductType`, `IntervalUnit`, `DiscountType`, `SourceChannel`
- **Zod Schemas**: request/response validation contracts shared between API and frontend
- **TypeScript types**: derived from Zod schemas for type-safe API consumption

---

*Built with ❤️ by Team Kavish*
