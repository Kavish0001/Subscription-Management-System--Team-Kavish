# Portal — Product Detail Page

## Route
`/products/:slug`

## Role Access
Public (all users)

## Layout
- **Left Section**: Product image/gallery
- **Right Section**: Product info + purchase controls

## UI Elements
- **Product Image**: Main image display
- **Product Name**: Large heading
- **Description**: Product description text
- **Price**: Base sales price (updates based on plan/variant selection)
- **Plan Selection**: Tabs/buttons for "Monthly", "6 Months", "Yearly"
  - Price updates dynamically when a plan is selected
- **Variant Selection**: Dropdown/option pickers for product variants
  - e.g., Brand → "Odoo" (extra price shown)
  - Attributes come from `product_attributes` & `product_attribute_values`
- **Add to Cart Button**: Primary CTA

## Key Behaviors
- Selecting a recurring plan updates the displayed price (from `product_plan_pricing`)
- Selecting a variant may add extra price (from `product_attribute_values.extra_price`)
- "Add to Cart" stores selection in local state (Zustand cart store)

## API Endpoints Needed
- `GET /api/products/:slug` — fetch single product with variants, plan pricing
- `GET /api/recurring-plans` — for plan selection tabs

## Database Tables Used
- `products`
- `product_variants`
- `product_variant_values`
- `product_attributes`
- `product_attribute_values`
- `product_plan_pricing`
- `recurring_plans`
