# Admin — Configuration: Payment Terms

## Route
`/admin/config/payment-terms`

## Role Access
`admin`, `internal_user`

## Access Path
Admin Nav → **Configuration** (dropdown) → **Payment Term**

---

### Overview
Payment terms define when and how payments are due for subscriptions and invoices. They are linked from the Subscription Form View's "Payment Term" dropdown field.

### List View

#### UI Elements
- **Toolbar**: "New" button
- **Table**:
  | Column | Description |
  |--------|-------------|
  | Label | e.g., "Immediate Payment", "Net 30" |
  | Description | Details about the term |

---

### Detail / Form View

#### Form Fields
- **Title / Name**: Text input (name of the payment term)
- **Early Discount**: Text/Number input (e.g., "2% if paid within 10 days")

#### Due Term Section
A table defining the payment schedule:
| Column | Description |
|--------|-------------|
| Due | The percentage or amount due — e.g., "100 percent" or "Fixed" amount |
| After | When it's due — e.g., "days after invoice create" |

- "Add Due Term" button to add multiple payment schedule lines
- Supports split payments (e.g., 50% immediately, 50% after 30 days)

## Notes from Mockup
> The Payment Term page is linked from the Subscription Form View via the "Payment Term" field (shown with an arrow in the wireframe).
> The "Due Term" table supports entries like: "100 percent/Fixed" due "days after invoice create".
> Early discount field allows configuring early payment discounts.

## Implementation Note
The current schema stores payment terms as a text label (`paymentTermLabel`) in subscriptions and invoices. For full implementation, consider creating a dedicated `payment_terms` table with:
- `id`, `name`, `earlyDiscount`, `earlyDiscountDays`
- Related `payment_term_lines` table with: `dueType` (percent/fixed), `dueValue`, `afterDays`, `afterEvent` (invoice_create/invoice_date)

## API Endpoints Needed
- `GET /api/payment-terms` — list all (needs to be built)
- `POST /api/payment-terms` — create
- `PUT /api/payment-terms/:id` — update
- `DELETE /api/payment-terms/:id` — delete

## Database Tables Used
- `payment_terms` (needs to be created or use existing `paymentTermLabel` string)
- `payment_term_lines` (needs to be created for due term schedule)
