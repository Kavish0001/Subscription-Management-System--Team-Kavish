# Portal — Shop Page

## Route
`/shop`

## Role Access
Public (all users)

## Layout
- **Top Navbar**: Same as Home
- **Sidebar (Left)**: Category filter — "All", "Category 1", "Category 2", etc.
- **Main Content (Right)**: Product grid with search

## UI Elements
- **Search Bar**: Filter products by name
- **Category Sidebar**: List of `ProductCategory` entries for filtering
- **Product Cards**: Grid layout (2-3 columns)
  - Product thumbnail/image
  - Product name
  - Price (base sales price)
  - Plan type indicator (if subscription-enabled)

## Key Behaviors
- Filter by category (sidebar click)
- Search by product name
- Click product card → navigate to `/products/:slug`
- Pagination for large catalogs

## API Endpoints Needed
- `GET /api/products?page=1&pageSize=12&categoryId=xxx` — paginated product list
- `GET /api/categories` — list product categories

## Database Tables Used
- `products`
- `product_categories`
- `product_plan_pricing`
