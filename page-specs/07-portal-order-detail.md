# Portal — Order / Subscription Detail

## Route
`/account/orders/:orderNumber`

## Role Access
Authenticated (`portal_user`) — only own orders

## Layout
- **Navbar**: Company Logo | Home | Shop | Cart | My Profile
- **Sub-nav buttons**: "User Details" button | "My Orders" button (highlighted)
- Header with order number + status + actions
- Two-column: Details (left) + Address (right)
- Order lines table (full width)

## UI Elements

### Header
- **Order Number**: e.g., `Order/S0001`
- **Status Badge**: S0012 / Active / Expiring / Paused / Closed
- **Action Buttons** (shown conditionally based on recurring plan flags):
  - **Renew**: Shown if `recurringPlan.isRenewable === true`
  - **Close**: Shown if `recurringPlan.isClosable === true`
  - **Download**: Download invoice PDF

### Left Section — Plan Details
- Plan Name
- Start Date
- End Date / Expiration Date
- Next Invoice Date
- Payment Terms

### Right Section — Addresses
- **Invoicing and Shipping Address** (shown side by side)
  - Full address details for both billing and shipping

### Invoice History
- Linked invoices listed below (clickable → invoice detail page)
- e.g., "This should redirect me to Invoice below"

### Order Lines Table (Products)
| Column | Source |
|--------|--------|
| Product | `productNameSnapshot` (e.g., "Product name") |
| Quantity | `quantity` (e.g., "100 unit") |
| Unit Price | `unitPrice` (e.g., "100 Rs") |
| Taxes | `taxAmount` (e.g., "18%") |
| Amount | `lineTotal` (e.g., "200.0") |

**Discount as line item**: Discounts appear as a separate row:
- "10% on your order" | 1 | -₹120 Rs | — | -₹120

### Totals Section
- Tax 15%: 160
- Total: 2640

## Notes from Mockup
> "On clicking Print/Renew, user order should be created and should be treated accordingly"
> "If payment is already done then this button should not show" (for payment CTA)
> "This cancel caption can be omitted below"
> Renew/Close actions should only appear based on the recurring plan's `isRenewable` / `isClosable` flags

## API Endpoints Needed
- `GET /api/subscriptions/:id` — with lines, invoices, plan, contact, addresses
- `POST /api/subscriptions/:id/renew` — create renewal (needs to be built)
- `POST /api/subscriptions/:id/close` — close subscription (needs to be built)

## Database Tables Used
- `subscription_orders`, `subscription_order_lines`
- `recurring_plans`
- `invoices`
- `contacts`, `addresses`
