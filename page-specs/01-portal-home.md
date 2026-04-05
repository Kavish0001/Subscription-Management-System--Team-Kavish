# Portal — Home Page

## Route
`/`

## Role Access
Public (all users — guest, portal_user)

## Layout
- **Top Navbar**: Logo (left), Navigation links (Home, Shop, My Account, Order, Address, Payment), Cart Icon (right)
- **Search Bar**: Centered below navigation

## UI Elements
- Hero section with branding
- Product/plan grid showcasing available subscription plans with prices
- Dynamic pricing cards showing recurring plan prices (Monthly, 6-Month, Yearly)

## Notes from Mockup
> "Price and billing should be shown accordingly subscription recurring plan"

## Key Behaviors
- Show featured products with their subscription pricing
- Navigation to Shop, Account, Cart
- Unauthenticated users see Login/Signup CTA
- Authenticated users see their name / account link

## API Endpoints Needed
- `GET /api/products` — fetch featured products
- `GET /api/recurring-plans` — fetch plan pricing options

## Database Tables Used
- `products`
- `recurring_plans`
- `product_plan_pricing`
