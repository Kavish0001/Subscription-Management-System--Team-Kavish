# Admin — Products Management

## Routes
- `/admin/products` — List view
- `/admin/products/new` — Create form
- `/admin/products/:id` — Edit form

## Role Access
`admin`, `internal_user`

## Layout
- **Top Navbar**: subscriptions | Products (highlighted) | Reporting | Users/contacts | Configuration | My Profile
- **List View**: Table (labeled "Product List Page" in mockup)
- **Detail View**: Form with tabs (labeled "Product form view Page" in mockup)

---

### List View (`/admin/products`) — "Product List Page"

#### UI Elements
- **Toolbar**: "New" button, Delete icon, Print icon
- **Search Bar**: Filter products
- **Table**:
  | Column | Source |
  |--------|--------|
  | Product Name | `name` |
  | Sales Price | `baseSalesPrice` |
  | Cost | `costPrice` |

> Note: The mockup shows only Product Name, Sales Price, and Cost columns in the list view (simpler than initially documented).

---

### Detail / Edit View (`/admin/products/:id`) — "Product form view Page"

#### Toolbar
- **Tabs**: subscriptions | Products (highlighted) | Reporting | Users/contacts | Configuration | My Profile
- **Actions**: New, Delete icon, Print icon

#### Form Fields (General)
- **Product Name**: Text input
- **Product Type**: Dropdown (Goods / Service)
- **Sales Price**: Number input
- **Cost price**: Number input
- **Tax**: Tax selection
- **Description**: Textarea

#### Tabs

**Recurring Prices Tab** (left tab):
Table of plan-specific pricing:
| Column | Source |
|--------|--------|
| Recurring Plan | `recurringPlan.name` |
| Price | Override price or plan default |
| Min qty | `minimumQuantity` |
| Start date | Plan start date |
| End date | Plan end date |
- "Add Pricing" button to link product to a plan

**Variants Tab** (right tab):
Table of product variants with Attribute/Values:
| Column | Source |
|--------|--------|
| Attribute | `productAttribute.name` (e.g., "Brand") |
| Values | `productAttributeValue.value` (e.g., "Odoo") |
- "Add Variant" button
- Each variant links to `product_attribute_values` via `product_variant_values`

## Notes from Mockup
> Variants tab shows "Attribute" and "Values" columns directly (not variant name/SKU)
> Attributes come from the Configuration → Attribute page
> Example: Attribute "Brand" → Value "Odoo" with extra price ₹20

## API Endpoints Needed
- `GET /api/products` — paginated list
- `GET /api/products/:id` — detail with variants, plan pricing, tax rules
- `POST /api/products` — create
- `PUT /api/products/:id` — update
- `DELETE /api/products/:id` — delete
- `POST /api/products/:id/variants` — add variant
- `POST /api/products/:id/plan-pricing` — link to recurring plan

## Database Tables Used
- `products`
- `product_categories`
- `product_variants`, `product_variant_values`
- `product_attributes`, `product_attribute_values`
- `product_plan_pricing`
- `product_tax_rules`, `tax_rules`
