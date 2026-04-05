# Portal — Cart & Checkout (Multi-Step)

## Routes
- `/cart` — Step 1: Order Review
- `/checkout/address` — Step 2: Address
- `/checkout/payment` — Step 3: Payment

## Role Access
Authenticated (`portal_user`) only

## Layout
- **Navbar**: Company Logo | Home | Shop | My Account | Cart | My Profile
- **Tab/Step Indicator**: "Order → Address → Payment" tabs across top of content
- **Two-Column Layout**: Order details (left) + Order Summary sidebar (right)

> **IMPORTANT (Mockup Note)**: "This box should be there on address and payment page both" — The order summary sidebar (showing product thumbnails, subtotal, taxes, total) must persist across ALL 3 checkout steps.

---

### Step 1: Order Review (`/cart`)

#### Left Side — Order Lines Table
| Column | Source |
|--------|--------|
| (Checkbox/Thumbnail) | Product image |
| Product Name | Product name |
| Price & Billing | e.g., "500 rs per day" — from plan pricing |
| Qty | User-selected quantity |
| Amount | Qty × Unit Price |
- **Remove Button**: Per line item to remove from cart
- **Discount Line**: If a discount is applied, it appears as a separate line item in the table:
  - e.g., "10% on your order" | 1 | -₹120 Rs | | -₹120
- **Discount Code Section**: Text input + "Apply" button
  - Shows "You have successfully applied" message on successful validation

#### Right Side — Order Summary Sidebar
| Field | Value |
|-------|-------|
| Product thumbnails | Small product images with name and price |
| Discount line | e.g., "10% off on your order  -₹60" |
| Subtotal | 1080 |
| Taxes | 120 |
| **Total** | **1200** |

- **Checkout Button**: Proceed to next step

#### Key Behaviors
- Quantity editable inline
- Remove item option
- Discount applied as a negative LINE ITEM in the order (not just subtracted from total)
- Discount code validation against `discount_rules`
- Tax auto-calculated from `tax_rules` linked to products

---

### Step 2: Address (`/checkout/address`)

#### Left Side
- **Shipping Address Form**: line1, line2, city, state, postalCode, country
- **Billing Address Form**: Same fields (or "Same as shipping" checkbox)
- **Option to add different address**: Should allow adding new address

#### Right Side — Same Order Summary Sidebar
(Same summary box from Step 1 persists here)

#### Notes from Mockup
> "For address page by default user's address should come and later on if they want to add different that option should also be given"

#### Key Behaviors
- Pre-fill from user's default contact address (`addresses` table)
- Allow editing or adding a new address before proceeding

---

### Step 3: Payment (`/checkout/payment`)

#### Left Side
- **Payment Method Selection**: Radio/card selection for payment gateways

#### Right Side — Same Order Summary Sidebar
(Same summary box from Step 1 persists here)

#### Notes from Mockup
> "For payment any demo or testing beta version payment gate will work and accordingly page should be implemented"

#### Key Behaviors
- On click "Checkout" / "Pay Now":
  1. Create subscription (`POST /api/subscriptions`) with `sourceChannel: 'portal'`
  2. Create invoice (`POST /api/invoices`)
  3. Process mock payment (`POST /api/payments/mock`)
  4. Redirect to Order Success page

> **Mockup Note**: "On click of this it should take us to order page as mentioned below directly"

## API Endpoints Needed
- `POST /api/subscriptions` — create subscription order
- `POST /api/invoices` — generate invoice from subscription
- `POST /api/payments/mock` — process mock payment
- `GET /api/contacts/me` — get user's default address
- `POST /api/discounts/validate` — validate discount code (needs to be built)

## Database Tables Used
- `subscription_orders`, `subscription_order_lines`
- `invoices`, `invoice_lines`
- `payments`
- `contacts`, `addresses`
- `discount_rules`
- `tax_rules`, `product_tax_rules`
