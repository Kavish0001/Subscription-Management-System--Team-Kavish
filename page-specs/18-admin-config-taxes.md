# Admin — Configuration: Taxes

## Route
`/admin/config/taxes`

## Role Access
`admin`, `internal_user`

## Access Path
Admin Nav → **Configuration** (dropdown) → **Taxes**

---

### List View

#### UI Elements
- **Toolbar**: "New" button
- **Table**:
  | Column | Source |
  |--------|--------|
  | Tax Name | `name` |
  | Rate | `ratePercent` % |
  | Type | `taxType` (e.g., GST, VAT, Sales Tax) |
  | Inclusive | Yes/No |
  | Status | Active/Inactive |

---

### Detail / Form View

#### Form Fields
- **Tax Name**: Text input (e.g., "GST 18%")
- **Rate Percent**: Number input (e.g., 18.00)
- **Tax Type**: Text input (e.g., "GST", "VAT", "Sales Tax")
- **Is Inclusive**: Toggle (whether tax is included in price or added)
- **Active**: Toggle

## Key Behaviors
- Tax rules are linked to products via `product_tax_rules`
- During invoice generation, taxes are auto-calculated from linked tax rules
- Tax rate is snapshot at the time of order/invoice creation

## API Endpoints Needed
- `GET /api/tax-rules` — list (needs to be built)
- `POST /api/tax-rules` — create
- `PUT /api/tax-rules/:id` — update
- `DELETE /api/tax-rules/:id` — delete

## Database Tables Used
- `tax_rules`
- `product_tax_rules`
