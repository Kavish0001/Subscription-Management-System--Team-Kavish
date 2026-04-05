# Admin — Dashboard / Reporting

## Route
`/admin` (index)

## Role Access
`admin`, `internal_user`

## Layout
- **Top Navbar Tabs**: Subscriptions | Products | Reporting | Users/Contacts | Configuration
- **Main Content**: Dashboard metrics + charts

## UI Elements

### Metric Cards (Top Row)
- **Active Subscriptions**: Count of `status = 'active'`
- **MRR (Monthly Recurring Revenue)**: Sum of active subscription amounts
- **Overdue Invoices**: Count of confirmed invoices past due date
- **Total Revenue**: Sum of all paid invoice amounts

### Charts / Summary Views
- Revenue trend (line chart)
- Subscription status distribution (pie/bar chart)
- Payment collection summary
- Subscription plan breakdown

### Quick Actions
- Recent subscriptions list
- Recent payments

## Notes from Mockup
> "Reporting" in nav opens this dashboard/report view

## API Endpoints Needed
- `GET /api/reports/summary` — aggregate metrics (needs to be built)
  ```json
  {
    "activeSubscriptions": 128,
    "mrr": 420000,
    "overdueInvoices": 12,
    "totalRevenue": 5200000,
    "recentSubscriptions": [...],
    "recentPayments": [...]
  }
  ```

## Database Tables Used
- `subscription_orders` (count by status)
- `invoices` (overdue = confirmed + dueDate < now)
- `payments` (sum of succeeded payments)
