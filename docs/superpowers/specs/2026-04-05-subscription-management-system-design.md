# Subscription Management System — Design Spec
**Date:** 2026-04-05  
**Stack:** PERN (PostgreSQL · Express · React · Node.js) + TypeScript + Prisma + shadcn/ui + Tailwind  
**Structure:** Single repo, `frontend/` and `backend/` folders with separate `package.json`

---

## 1. Overview

An Odoo-like subscription management platform with two surfaces:
- **Customer Portal** — public shop, cart/checkout, order/invoice history, profile
- **Admin Panel** — subscription/product/user management, configuration, reporting

20 page specs drive the implementation. All frontend pages are fully responsive (mobile-first, Tailwind breakpoints).

---

## 2. Repository Structure

```
/
├── backend/
│   ├── src/
│   │   ├── config/          # env.ts, mailer.ts, prisma.ts
│   │   ├── middleware/      # auth.ts, error-handler.ts, role-guard.ts
│   │   ├── modules/
│   │   │   ├── auth/            # router, service, schema
│   │   │   ├── users/
│   │   │   ├── contacts/
│   │   │   ├── products/
│   │   │   ├── catalog/         # categories + attributes
│   │   │   ├── subscriptions/
│   │   │   ├── invoices/
│   │   │   ├── payments/
│   │   │   ├── discounts/
│   │   │   ├── taxes/
│   │   │   ├── recurring-plans/
│   │   │   ├── quotation-templates/
│   │   │   ├── payment-terms/
│   │   │   └── reports/
│   │   ├── lib/             # prisma client singleton, jwt helpers, mailer instance
│   │   ├── routes/          # index.ts assembles all module routers
│   │   └── index.ts         # express app entrypoint
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts          # default admin + sample data
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # shared: DataTable, FormField, StatusBadge, PageHeader, Modal
│   │   ├── layouts/         # PortalLayout, AdminLayout, AuthLayout
│   │   ├── features/
│   │   │   ├── auth/        # LoginPage, SignupPage, ResetPasswordPage
│   │   │   ├── portal/      # Home, Shop, ProductDetail, Cart, Checkout, Orders, Profile
│   │   │   └── admin/       # Dashboard, Subscriptions, Products, Users, Config pages
│   │   ├── hooks/           # useAuth, useCart, shared React Query hooks
│   │   ├── store/           # Zustand: authStore, cartStore (persisted)
│   │   ├── api/             # axios instance + per-module query/mutation hooks
│   │   ├── lib/             # formatters, validators, cn() util
│   │   └── app/             # router.tsx (React Router v6), providers.tsx
│   ├── public/
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
└── page-specs/
```

**Module pattern** — each backend module has exactly:
- `router.ts` — Express Router, declares routes
- `service.ts` — business logic, Prisma calls
- `schema.ts` — Zod schemas for request validation

---

## 3. Database Schema (Prisma)

### Auth / Users
```prisma
model User {
  id                       String    @id @default(cuid())
  email                    String    @unique
  passwordHash             String
  role                     Role      @default(portal_user)
  resetPasswordTokenHash   String?
  resetPasswordExpiresAt   DateTime?
  isActive                 Boolean   @default(true)
  createdAt                DateTime  @default(now())
  contacts                 Contact[]
}

enum Role { admin internal_user portal_user }
```

### Contacts & Addresses
```prisma
model Contact {
  id        String    @id @default(cuid())
  userId    String?
  name      String
  email     String?
  phone     String?
  isDefault Boolean   @default(false)
  user      User?     @relation(fields: [userId], references: [id])
  addresses Address[]
  subscriptionOrders SubscriptionOrder[]
  invoices  Invoice[]
}

model Address {
  id         String  @id @default(cuid())
  contactId  String
  type       AddressType
  line1      String
  line2      String?
  city       String
  state      String?
  postalCode String?
  country    String
  contact    Contact @relation(fields: [contactId], references: [id])
}

enum AddressType { billing shipping }
```

### Products & Catalog
```prisma
model ProductCategory { id, name }
model ProductAttribute { id, name, description, values ProductAttributeValue[] }
model ProductAttributeValue { id, attributeId, value, extraPrice }

model Product {
  id             String
  name           String
  slug           String @unique
  description    String?
  productType    ProductType  // goods | service
  baseSalesPrice Decimal
  costPrice      Decimal
  categoryId     String?
  isActive       Boolean
  variants       ProductVariant[]
  planPricing    ProductPlanPricing[]
  taxRules       ProductTaxRule[]
}

model ProductVariant { id, productId, values ProductVariantValue[] }
model ProductVariantValue { id, variantId, attributeValueId }
model ProductPlanPricing { id, productId, recurringPlanId, price, minimumQuantity, startDate, endDate }
model ProductTaxRule { id, productId, taxRuleId }
```

### Recurring Plans & Configuration
```prisma
model RecurringPlan {
  id             String
  name           String
  price          Decimal
  intervalCount  Int
  intervalUnit   IntervalUnit   // day | week | month | year
  minimumQuantity Int           @default(1)
  isAutoClose    Boolean        @default(false)
  autoCloseCount Int?
  autoCloseUnit  IntervalUnit?
  isClosable     Boolean        @default(false)
  isPausable     Boolean        @default(false)
  isRenewable    Boolean        @default(false)
  startDate      DateTime?
  endDate        DateTime?
  isActive       Boolean        @default(true)
}

model QuotationTemplate { id, name, validityDays, recurringPlanId, paymentTermLabel, description, lines QuotationTemplateLine[] }
model QuotationTemplateLine { id, templateId, productId, variantId?, quantity, unitPrice, sortOrder }
model TaxRule { id, name, ratePercent, taxType, isInclusive, isActive }
model DiscountRule { id, name, code @unique, type DiscountType, value, minimumPurchase?, minimumQuantity?, startDate?, endDate?, usageLimit?, usageCount, scopeType, isActive, products DiscountRuleProduct[] }
model PaymentTerm { id, name, earlyDiscount?, earlyDiscountDays?, lines PaymentTermLine[] }
model PaymentTermLine { id, paymentTermId, dueType DueType, dueValue, afterDays }
```

### Subscriptions
```prisma
model SubscriptionOrder {
  id                  String
  subscriptionNumber  String @unique  // SUB-0001
  customerContactId   String
  status              SubscriptionStatus  // draft|quotation_sent|confirmed|active|paused|closed
  recurringPlanId     String?
  quotationTemplateId String?
  paymentTermId       String?
  totalAmount         Decimal
  expirationDate      DateTime?
  startDate           DateTime?
  nextInvoiceDate     DateTime?
  sourceChannel       String?   // portal | admin
  salesperson         String?
  notes               String?
  lines               SubscriptionOrderLine[]
  invoices            Invoice[]
  createdAt           DateTime  @default(now())
}

model SubscriptionOrderLine {
  id                   String
  subscriptionOrderId  String
  productId            String
  variantId            String?
  productNameSnapshot  String
  quantity             Decimal
  unitPrice            Decimal
  discountAmount       Decimal  @default(0)
  taxAmount            Decimal  @default(0)
  lineTotal            Decimal
  taxes                SubscriptionOrderLineTax[]
}
```

### Invoices & Payments
```prisma
model Invoice {
  id            String
  invoiceNumber String @unique   // INV-0001
  subscriptionOrderId String?
  contactId     String
  status        InvoiceStatus  // draft|confirmed|paid|overdue
  invoiceDate   DateTime
  dueDate       DateTime?
  subtotal      Decimal
  taxAmount     Decimal
  discountAmount Decimal        @default(0)
  totalAmount   Decimal
  paymentTermLabel String?
  lines         InvoiceLine[]
  payments      Payment[]
}

model InvoiceLine { id, invoiceId, productNameSnapshot, quantity, unitPrice, taxAmount, lineTotal, discountAmount }
model Payment { id, invoiceId, amount, method, status PaymentStatus, paidAt? }
```

---

## 4. API Routes

### Auth
| Method | Path | Auth |
|--------|------|------|
| POST | /api/auth/login | public |
| POST | /api/auth/signup | public |
| POST | /api/auth/reset-password | public |
| POST | /api/auth/reset-password/confirm | public |
| POST | /api/auth/refresh | public |

### Users & Contacts
| Method | Path | Auth |
|--------|------|------|
| GET/POST | /api/users | admin |
| GET/PUT | /api/users/:id | admin |
| GET | /api/contacts/me | portal_user+ |
| GET/POST | /api/contacts | admin/internal_user |
| GET/PUT | /api/contacts/:id | admin/internal_user |

### Products & Catalog
| Method | Path | Auth |
|--------|------|------|
| GET | /api/products | public |
| GET | /api/products/:slug | public |
| POST | /api/products | admin/internal_user |
| PUT/DELETE | /api/products/:id | admin/internal_user |
| POST | /api/products/:id/variants | admin/internal_user |
| POST | /api/products/:id/plan-pricing | admin/internal_user |
| GET | /api/categories | public |
| GET/POST/PUT/DELETE | /api/attributes | admin/internal_user |
| POST | /api/attributes/:id/values | admin/internal_user |

### Configuration
| Method | Path | Auth |
|--------|------|------|
| GET/POST/PUT/DELETE | /api/recurring-plans | admin/internal_user |
| GET/POST/PUT/DELETE | /api/quotation-templates | admin/internal_user |
| GET/POST/PUT/DELETE | /api/tax-rules | admin/internal_user |
| GET/POST | /api/discount-rules | admin only (POST) |
| PUT/DELETE | /api/discount-rules/:id | admin |
| POST | /api/discount-rules/validate | portal_user+ |
| GET/POST/PUT/DELETE | /api/payment-terms | admin/internal_user |

### Subscriptions
| Method | Path | Auth |
|--------|------|------|
| GET/POST | /api/subscriptions | admin/internal_user |
| GET/PUT/DELETE | /api/subscriptions/:id | admin/internal_user |
| GET | /api/subscriptions/my | portal_user |
| POST | /api/subscriptions/:id/send-quotation | admin/internal_user |
| POST | /api/subscriptions/:id/confirm | admin/internal_user |
| POST | /api/subscriptions/:id/renew | portal_user |
| POST | /api/subscriptions/:id/close | portal_user |

### Invoices & Payments
| Method | Path | Auth |
|--------|------|------|
| GET/POST | /api/invoices | admin/internal_user |
| GET | /api/invoices/:id | portal_user+ |
| POST | /api/payments/mock | portal_user+ |

### Reports
| Method | Path | Auth |
|--------|------|------|
| GET | /api/reports/summary | admin/internal_user |

---

## 5. Frontend Routing

### Auth Layout (centered card, no nav)
- `/login` — LoginPage
- `/signup` — SignupPage
- `/reset-password` — ResetPasswordPage

### Portal Layout (top navbar, responsive)
- `/` — Home (featured products, hero, plan cards)
- `/shop` — Shop (category sidebar, product grid, search, pagination)
- `/products/:slug` — ProductDetail (image, plan tabs, variant selector, add to cart)
- `/cart` — Cart (order review, discount code, summary sidebar)
- `/checkout/address` — Address step (pre-fill from contact, add new)
- `/checkout/payment` — Payment step (mock gateway selection)
- `/checkout/success` — Order success (confirmation + summary)
- `/account/orders` — My Orders list
- `/account/orders/:orderNumber` — Order detail (renew/close/download)
- `/account/invoices/:invoiceNumber` — Invoice detail (pay/download)
- `/account/profile` — Profile & contacts

### Admin Layout (top navbar + config dropdown, collapsible on mobile)
- `/admin` — Dashboard (metric cards + charts)
- `/admin/subscriptions` — List + New + Detail/Edit
- `/admin/products` — List + New + Detail/Edit
- `/admin/users` — List + Detail/Edit
- `/admin/reports` — Reports view
- `/admin/config/attributes`
- `/admin/config/recurring-plans`
- `/admin/config/quotation-templates`
- `/admin/config/discounts`
- `/admin/config/taxes`
- `/admin/config/payment-terms`

### Route Guards
- `PortalGuard` — requires any authenticated user, redirects to `/login`
- `AdminGuard` — requires `admin` or `internal_user` role, redirects to `/`
- Role-specific UI shown/hidden per role (e.g., "New" button hidden for `internal_user`)

---

## 6. State Management

**Zustand stores (frontend/src/store/):**
- `authStore` — `{ user, accessToken, login(), logout() }` — persisted to localStorage
- `cartStore` — `{ items[], discount, addItem(), removeItem(), updateQty(), applyDiscount(), clear() }` — persisted to localStorage

**React Query:**
- All server data fetched/mutated via custom hooks in `frontend/src/api/`
- Axios instance with interceptor: attaches `Authorization: Bearer <token>`, handles 401→refresh

---

## 7. Auth & SMTP

**JWT strategy:**
- Access token: 15min expiry, stored in memory (authStore)
- Refresh token: 7d expiry, sent in httpOnly cookie
- `/api/auth/refresh` rotates both tokens

**Password reset:**
1. `POST /api/auth/reset-password` — generate crypto token, hash & store with 1hr expiry, send email
2. Email via Nodemailer: `smtp.gmail.com:587` STARTTLS, Gmail app password
3. `POST /api/auth/reset-password/confirm` — verify hash, update password, clear token

**Signup side-effects:**
- Creates `User` (role: portal_user)
- Creates default `Contact` (isDefault: true) linked to user
- Creates billing + shipping `Address` records (empty, editable in profile)

**Seed (prisma/seed.ts):**
- Admin user: `admin@example.com` / `Admin@123`
- 3 sample products, 3 recurring plans (Monthly, 6-Month, Yearly), 1 tax rule (GST 18%)

---

## 8. Responsiveness & DRY Principles

**Responsive breakpoints (Tailwind mobile-first):**
- Mobile (<640px): stacked layout, hamburger menu, full-width cards
- Tablet (640–1024px): 2-col grids, collapsible sidebar
- Desktop (>1024px): full layout with persistent sidebars

**Shared components (DRY):**
- `DataTable` — columns prop, handles loading/empty states, used across all list views
- `FormField` — label + input + error message wrapper
- `StatusBadge` — color-coded by status string
- `PageHeader` — title + action buttons, used in all admin pages
- `OrderSummaryCard` — persists across all 3 checkout steps
- `ConfirmDialog` — modal for destructive actions (delete, close subscription)

---

## 9. Environment Variables

**backend/.env:**
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/subms
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=hailhsk2002@gmail.com
SMTP_PASS=tsuqdivdbmopnrnc
FRONTEND_URL=http://localhost:5173
PORT=4000
```

**frontend/.env:**
```env
VITE_API_URL=http://localhost:4000
```

---

## 10. Implementation Order

1. Backend: Prisma schema + migrations + seed
2. Backend: Auth module (login, signup, reset-password)
3. Backend: All configuration modules (recurring plans, taxes, attributes, payment terms, quotation templates, discounts)
4. Backend: Products + catalog module
5. Backend: Subscriptions + invoices + payments + reports
6. Backend: Contacts + users
7. Frontend: Setup (Vite, Tailwind, shadcn/ui, Zustand, React Query, React Router)
8. Frontend: Auth pages
9. Frontend: Shared components (DataTable, FormField, StatusBadge, PageHeader, OrderSummaryCard)
10. Frontend: Admin layout + all admin pages
11. Frontend: Portal layout + all portal pages
