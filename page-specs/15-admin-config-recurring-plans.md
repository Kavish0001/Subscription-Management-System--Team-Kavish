# Admin — Configuration: Recurring Plans

## Route
`/admin/config/recurring-plans`

## Role Access
`admin`, `internal_user`

## Access Path
Admin Nav → **Configuration** (dropdown) → **Recurring Plan**

---

### List View

#### UI Elements
- **Toolbar**: "New" button
- **Table**:
  | Column | Source |
  |--------|--------|
  | Plan Name | `name` |
  | Interval | `intervalCount` + `intervalUnit` (e.g., "1 Month") |
  | Price | `price` |
  | Min Qty | `minimumQuantity` |
  | Status | Active/Inactive |

---

### Detail / Form View

#### Form Fields
- **Plan Name**: Text input
- **Price**: Number input
- **Interval Count**: Number (e.g., 1, 6, 12)
- **Interval Unit**: Dropdown (Day / Week / Month / Year)
- **Minimum Quantity**: Number input
- **Start Date**: Date picker (optional)
- **End Date**: Date picker (optional)

#### Plan Options (Toggles)
- **Auto-Close**: Toggle + count + unit (e.g., auto-close after 12 months)
- **Closable**: Toggle — allows portal users to close subscription
- **Pausable**: Toggle — allows portal users to pause subscription
- **Renewable**: Toggle — allows portal users to renew subscription

## Notes from Mockup
> "Closable/pausable/Renew means if subscription is used this recurring plan then it's for eg. closable or not and same should show on portal if it true."

## API Endpoints Needed
- `GET /api/recurring-plans` — list (exists)
- `POST /api/recurring-plans` — create (exists)
- `PUT /api/recurring-plans/:id` — update (needs to be built)
- `DELETE /api/recurring-plans/:id` — delete

## Database Tables Used
- `recurring_plans`
