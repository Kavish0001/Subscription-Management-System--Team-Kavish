# Admin — Configuration: Discounts

## Route
`/admin/config/discounts`

## Role Access
`admin` only (creation), `internal_user` (view)

## Access Path
Admin Nav → **Configuration** (dropdown) → **Discount**

---

### List View

#### UI Elements
- **Toolbar**: "New" button (admin only)
- **Table**:
  | Column | Source |
  |--------|--------|
  | Discount Name | `name` |
  | Code | `code` |
  | Type | Fixed / Percentage |
  | Value | `value` (₹ or %) |
  | Usage | `usageCount` / `usageLimit` |
  | Status | Active/Inactive |

---

### Detail / Form View

#### Form Fields
- **Discount Name**: Text input
- **Code**: Text input (unique coupon code)
- **Type**: Dropdown — Fixed / Percentage
- **Value**: Number input (amount or percentage)
- **Minimum Purchase**: Number input (optional)
- **Minimum Quantity**: Number input (optional)
- **Start Date**: Date picker
- **End Date**: Date picker
- **Limit Usage**: Toggle
- **Usage Limit**: Number (if limit enabled)

#### Scope Section
- **Scope Type**: Dropdown — All Products / Selected Products / Subscriptions
- **Product Selection** (if "Selected Products"):
  - Multi-select from products list

## Rules from Problem Statement
> "Discount record should be created by admin only"
> Rule: Discounts can be created only by Admin.

## API Endpoints Needed
- `GET /api/discounts` — list (exists)
- `POST /api/discounts` — create admin-only (exists)
- `PUT /api/discounts/:id` — update (needs to be built)
- `DELETE /api/discounts/:id` — delete
- `POST /api/discounts/validate` — validate coupon code at checkout

## Database Tables Used
- `discount_rules`
- `discount_rule_products`
- `products`
