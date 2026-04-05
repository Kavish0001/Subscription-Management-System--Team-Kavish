# Admin — Users & Contacts Management

## Route
`/admin/users`

## Role Access
`admin` (create internal users), `internal_user` (view only)

## Layout
- **List View**: Table of users/contacts
- **Detail View**: Edit form

---

### List View

#### UI Elements
- **Toolbar**: "New" button (admin only)
- **Table**:
  | Column | Source |
  |--------|--------|
  | Name | `contact.name` |
  | Email | `user.email` |
  | Role | `user.role` |
  | Phone | `contact.phone` |
  | Status | Active/Inactive |

---

### Detail / Edit View

#### Form Fields
- **Email**: Text input
- **Phone Number**: Text input
- **Role**: Dropdown (admin can assign `internal_user` or `portal_user`)
- **Active**: Toggle

#### Address Section
- **Address Lines**: Multiple address entries (billing, shipping)
  - line1, line2, city, state, postalCode, country, type

## Rules from Problem Statement
> "Only Admin can create Internal Users."
> "By default one contact record should be created for user and linked here."
> "One user can create multiple contacts — that's why contact model is different."

## API Endpoints Needed
- `GET /api/users` — list all users with contacts
- `GET /api/users/:id` — detail
- `POST /api/users` — create internal user (admin only)
- `PUT /api/users/:id` — update
- `GET /api/contacts` — list contacts
- `POST /api/contacts` — create contact
- `PUT /api/contacts/:id` — update contact

## Database Tables Used
- `users`
- `contacts`
- `addresses`
