# Portal — My Orders (List)

## Route
`/account/orders`

## Role Access
Authenticated (`portal_user`)

## Layout
- Standard portal layout with navbar
- Table listing all orders

## UI Elements
- **Orders Table**:
  | Column | Description |
  |--------|-------------|
  | Order ID | Subscription number (e.g., SUB-xxx) |
  | Order Date | `createdAt` |
  | Total | `totalAmount` |
  | Status | Status badge (Draft, Active, Paused, Closed, etc.) |
- Each row is clickable → navigates to `/account/orders/:orderNumber`

## Key Behaviors
- Fetch all subscriptions for the logged-in user's contact
- Show status with color-coded badges:
  - **Active** = green
  - **Paused** = yellow
  - **Closed** = red
  - **Draft/Quotation** = gray

## API Endpoints Needed
- `GET /api/subscriptions/my` — fetch subscriptions for current portal user (needs to be built)

## Database Tables Used
- `subscription_orders`
- `contacts` (to filter by current user's contact)
