# Portal — Invoice Detail

## Route
`/account/invoices/:invoiceNumber`

## Role Access
Authenticated (`portal_user`) — only own invoices

## Layout
- **Navbar**: Company Logo | Home | Shop | Cart | My Profile
- Invoice header with breadcrumb (e.g., `Order/S0001/Inv/001`)
- Action buttons
- Two-column: Invoice details (left) + Customer Address (right)
- Products table (full width)
- Totals summary

## UI Elements

### Header / Breadcrumb
- **Breadcrumb**: `Order/S0001/Inv/001`
- **Invoice Number**: e.g., `Invoice INV/0015`
- **Action Buttons**: 
  - **Payment**: Pay now (if unpaid)
  - **Download**: Download PDF

### Invoice Metadata
- **Invoice Date**: Date field
- **Due Date**: Date field
- **Source**: Source label

### Customer Address Section (Right)
- **Customer Name**: ________
- **Email**: ________

### Line Items Table (Products)
| Column | Source |
|--------|--------|
| Product | `productNameSnapshot` (e.g., "Product name") |
| Quantity | `quantity` (e.g., "200 unit") |
| Unit Price | `unitPrice` (e.g., "2100 Rs") |
| Taxes | Tax % (e.g., "18%") |
| Amount | `lineTotal` (e.g., "180.0") |

**Discount as line item**: Discounts appear as a separate row:
- "10% on your order" | 1 | -₹120 Rs | — | -₹120

### Totals Summary
| Field | Value |
|-------|-------|
| Untaxed Amount | 2280 |
| Tax 15% | 360 |
| **Total** | **2640** |
| Paid on 06/02/2026 | 2640 |
| **Amount Due** | **0** |

### Payment Terms
- **Payment Term**: "Immediate Payment"

## Key Behaviors
- If invoice is already paid, hide Payment button
- Download generates a printable PDF invoice
- Clicking Payment processes mock payment

## API Endpoints Needed
- `GET /api/invoices/:id` — with lines, payment info, customer contact
- `POST /api/payments/mock` — process payment (if unpaid)

## Database Tables Used
- `invoices`, `invoice_lines`
- `payments`
- `contacts`
