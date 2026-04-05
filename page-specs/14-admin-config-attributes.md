# Admin — Configuration: Attributes

## Route
`/admin/config/attributes`

## Role Access
`admin`, `internal_user`

## Access Path
Admin Nav → **Configuration** (dropdown) → **Attribute**

## Layout
- **Navbar Tabs**: When "Attribute" is selected from Configuration dropdown, the top tabs update to show: subscriptions | Products | Reporting | Users/contacts | **Attribute**
- **List/Form View**: Standard CRUD

---

### List View

#### UI Elements
- **Toolbar**: "New" button, Delete icon, Print icon
- **Table**:
  | Column | Source |
  |--------|--------|
  | Attribute Name | `name` |
  | Description | `description` |
  | Status | Active/Inactive |

---

### Detail / Form View

#### Form Fields
- **Attribute Name**: Text input (e.g., "Brand")
- **Description**: Textarea

#### Attribute Values Table (Inline)
| Column | Source |
|--------|--------|
| Value | `value` (e.g., "Odoo") |
| Extra Price | `extraPrice` (e.g., ₹20) |
- "Add Value" button

## Notes from Mockup
> "For ex. attribute name is Brand, value is Odoo, extra price is 20 Rs."

## API Endpoints Needed
- `GET /api/attributes` — list (needs to be built)
- `POST /api/attributes` — create
- `PUT /api/attributes/:id` — update
- `DELETE /api/attributes/:id` — delete
- `POST /api/attributes/:id/values` — add value
- `PUT /api/attributes/:id/values/:valueId` — update value

## Database Tables Used
- `product_attributes`
- `product_attribute_values`
