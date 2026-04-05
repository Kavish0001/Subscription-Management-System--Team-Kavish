# Admin — Configuration: Quotation Templates

## Route
`/admin/config/quotation-templates`

## Role Access
`admin`, `internal_user`

## Access Path
Admin Nav → **Configuration** (dropdown) → **Quotation Template**

---

### List View

#### UI Elements
- **Toolbar**: "New" button
- **Table**:
  | Column | Source |
  |--------|--------|
  | Template Name | `name` |
  | Validity Days | `validityDays` |
  | Recurring Plan | `recurringPlan.name` |
  | Status | Active/Inactive |

---

### Detail / Form View

#### Form Fields
- **Template Name**: Text input
- **Validity Days**: Number input (how long the quotation is valid)
- **Recurring Plan**: Dropdown (from `recurring_plans`)
- **Payment Term Label**: Text input (e.g., "30 Days", "Immediate Payment")
- **Description**: Textarea

#### Product Lines Table (Inline)
| Column | Source |
|--------|--------|
| Product | Dropdown (from products) |
| Variant | Dropdown (from product variants, optional) |
| Quantity | Number input |
| Unit Price | Number input |
| Sort Order | Number (drag handle) |
- "Add Line" button

## Key Behaviors
- When creating a subscription, selecting a template auto-fills the order lines
- Speeds up subscription setup with predefined product bundles

## API Endpoints Needed
- `GET /api/quotation-templates` — list (needs to be built)
- `GET /api/quotation-templates/:id` — detail with lines
- `POST /api/quotation-templates` — create
- `PUT /api/quotation-templates/:id` — update
- `DELETE /api/quotation-templates/:id` — delete

## Database Tables Used
- `quotation_templates`
- `quotation_template_lines`
- `recurring_plans`
- `products`
- `product_variants`
