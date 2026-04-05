# Admin — Subscriptions Management

## Routes
- `/admin/subscriptions` — List view
- `/admin/subscriptions/new` — Create form
- `/admin/subscriptions/:id` — Detail/Edit view

## Role Access
`admin`, `internal_user`

## Layout
- **Top Navbar**: subscriptions | Products | Reporting | Users/contacts | Configuration | My Profile
- **List View**: Table with actions
- **Detail View**: Form with tabs (labeled "Subscription Form View" in mockup)

---

### List View (`/admin/subscriptions`)

#### UI Elements
- **Toolbar**: "New" button, Delete icon, Print icon
- **Search Bar**: Below toolbar
- **Table**:
  | Column | Source |
  |--------|--------|
  | Subscription No. | `subscriptionNumber` |
  | Customer | `customerContact.name` |
  | Status | Status badge |
  | Expiration | `expirationDate` |
  | Recurring Plan | `recurringPlan.name` |
  | Total | `totalAmount` |

#### Status Badges
- Draft → gray
- Quotation Sent → blue
- Confirmed → orange
- Active → green
- Paused → yellow
- Closed → red

---

### Detail / Edit View (`/admin/subscriptions/:id`) — "Subscription Form View"

#### Header Actions (Toolbar)
- **New**: Create new subscription
- **Delete** (trash icon): Delete subscription (if draft)
- **Print** (printer icon): Print subscription
- **Send**: Send quotation to customer
- **Confirm**: Confirm the subscription
- **Preview**: Preview quotation document

#### Status State Indicator (shown as tabs/badges in header)
- **Quotation** (highlighted/active) → **quotation sent** → **confirmed**
- Label: "state of subscription"

#### Form Fields
- **Subscription number**: Auto-generated (read-only)
- **Customer**: Dropdown (select from contacts) — left column
- **Expiration**: Date picker — right column
- **Quotation template**: Dropdown (from `quotation_templates`) — left column
- **Quotation Date**: Date picker — right column
- **Recurring Plan**: Dropdown (from `recurring_plans`) — right column
- **Payment Term**: Dropdown (linked to Payment Term config page) — right column

#### Tabs
- **Order Lines Tab** (highlighted/active by default):
  | Column | Source |
  |--------|--------|
  | Product | Dropdown (from products) |
  | Quantity | Number input |
  | Unit Price | Number (auto-filled from product/plan) |
  | **Discount** | Number input (discount amount/percentage) |
  | Taxes | Auto-calculated |
  | Amount | Qty × Price - Discount |
  - Sample row: "demo" product
  - "Add Line" button at bottom
  - Subtotal, Tax, Total summary

- **Other Info Tab**:
  - Notes
  - Source Channel
  - Salesperson

## Notes from Mockup
> The Payment Term field has an arrow linking to the Payment Term configuration page, indicating it's a dropdown that selects from predefined payment term records.
> "once all the details are properly filled and validated user can:
> - either save the changes by clicking the 'Save Icon' on the left corner beside the New Button
> - or can delete the entire record if something is wrongly enter."

## Status Flow (from Mockup)
```
Quotation → Quotation Sent → Confirmed → Active → Closed
```

## API Endpoints Needed
- `GET /api/subscriptions` — list all
- `GET /api/subscriptions/:id` — detail with lines
- `POST /api/subscriptions` — create
- `PUT /api/subscriptions/:id` — update
- `DELETE /api/subscriptions/:id` — delete (draft only)
- `POST /api/subscriptions/:id/send-quotation` — status transition
- `POST /api/subscriptions/:id/confirm` — status transition

## Database Tables Used
- `subscription_orders`, `subscription_order_lines`
- `subscription_order_line_taxes`
- `contacts`
- `recurring_plans`
- `quotation_templates`
- `products`
- `discount_rules` (for line-level discounts)
