# Portal — User Profile / User Details Page

## Route
`/account/profile`

## Role Access
Authenticated (`portal_user`)

## Layout
- **Navbar**: Company Logo | Home | Shop | Cart | My Profile
- **Sub-nav buttons**: "User Details" button (highlighted) | "My Orders" button
- Form-based layout for editing personal details

## UI Elements

### Personal Info Form
- **User Name**: Text input (editable)
- **Email**: Text input (editable)
- **Phone Number**: Text input (editable)
- **Address**: Text input / textarea (editable)
- **Save Button**

### Linked Contacts
- "Who details/discount etc" — additional contact management
- List of additional contacts (one user can have multiple contacts)
- **Add Contact Button**
- Each contact shows: Name, Email, Phone

## Notes from Mockup
> "All information should editable"
> "By default one contact record should be created for user and linked here. Because one user can create multiple contact for that contact model is different."

## Key Behaviors
- Sub-navigation: Clicking "My Orders" navigates to `/account/orders`
- All fields are editable inline
- Save persists changes to the backend
- Default contact is automatically created at signup

## API Endpoints Needed
- `GET /api/contacts/me` — get current user's contacts + addresses
- `PUT /api/contacts/:id` — update contact details
- `PUT /api/contacts/:id/addresses/:addressId` — update address
- `POST /api/contacts` — create additional contact

## Database Tables Used
- `users`
- `contacts`
- `addresses`
