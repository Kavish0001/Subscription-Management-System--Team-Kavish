# Portal — Order Success Page

## Route
`/checkout/success`

## Role Access
Authenticated (`portal_user`)

## Layout
- **Navbar**: Company Logo | Home | Shop | My Account | Cart | My Profile
- **Two-Column Layout**: Confirmation message (left) + Order Summary (right)

## UI Elements

### Left Side — Confirmation
- **"Thanks you for your order"** heading
- **Order ID**: e.g., `Order S0001`
- **"Your payment has been processed"** message
- **Print Button**: Triggers browser print dialog

### Right Side — Order Summary
- Product thumbnails with name and price
- Discount line item (if applied, e.g., "10% off on your order -₹60")
- Subtotal: 1080
- Taxes: 120
- **Total**: 1200

## Key Behaviors
- Read order data from URL query param or Zustand state (passed from checkout)
- Display confirmation with subscription number
- Clear cart state after successful display
- Print button generates printable receipt

## Notes from Mockup
> "On click of this it should take us to order page as mentioned below directly" — i.e., after success, user navigates to their Orders page.

## API Endpoints Needed
- None (data passed from previous step) OR
- `GET /api/subscriptions/:id` — fetch newly created subscription

## Database Tables Used
- `subscription_orders`
