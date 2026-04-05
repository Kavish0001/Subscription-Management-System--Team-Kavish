# Authentication Pages

## Routes
- `/login` — Login page
- `/signup` — Signup page
- `/reset-password` — Password reset page

## Role Access
Public (unauthenticated users)

## Initial Setup
> "By default a one admin user should be created."
> Three types of users:
> 1. **Admin** (with all rights)
> 2. **Portal** (normal user — created via signup)
> 3. **Internal user** (with limited rights — created by admin only)
> Rule: "Only admin can create internal user"

---

### Login Page (`/login`)

#### UI Elements
- **Email Id**: Text input
- **Password**: Password input
- **Login Button**: Submit
- **"forget password? | sign up"**: Two links at bottom
  - "forget password?" → `/reset-password`
  - "sign up" → `/signup`

#### Error Handling (from Mockup)
- If email not found: throw error **"Account not exist"**
- If password doesn't match: throw error **"Invalid password"**

#### Key Behaviors
- Calls `POST /api/auth/login`
- Check for login credentials, match creds, and allow to login
- On success: stores tokens, redirects based on role:
  - `admin` / `internal_user` → `/admin`
  - `portal_user` → `/`
- "When clicked on SignUp, Land to SignUp page and only portal user will be create"
- "When Clicked on Forget Password click on Forget Password page"

---

### Signup Page (`/signup`)

#### UI Elements
- **Name**: Text input
- **Email id**: Text input
- **Password**: Password input
- **Re-Enter Password**: Password input (confirm)
- **Signup Button**: Submit
- **"signup with google or anyother"**: Social auth option (optional)

#### Validation Rules (from Mockup)
> "Check credential as follows:
> 1. Email Id should not be duplicate in database
> 2. Password must be unique and must contain a small case, a large case and a special character and length should be in more than 8 chars."

- Email must be unique (no duplicate in database)
- Password must contain:
  - At least one lowercase letter
  - At least one uppercase letter
  - At least one special character
  - Length > 8 characters
- Re-Enter Password must match Password

#### Key Behaviors
- Calls `POST /api/auth/signup`
- Creates user with role `portal_user` ("Create a 'portal user' database into the system on signup")
- Auto-creates default contact with billing/shipping addresses
- On success: stores tokens, redirects to `/`

---

### Reset Password (`/reset-password`)

#### UI Elements
- **Email**: Text input
- **Send Reset Link Button**: Submit
- **Success Message**: "Reset link sent to your email"

#### Key Behaviors
- Calls `POST /api/auth/reset-password`
- Sends email with reset token (via worker/BullMQ)
- Token stored in `resetPasswordTokenHash` with expiry in `resetPasswordExpiresAt`

## API Endpoints Needed
- `POST /api/auth/login` — (exists)
- `POST /api/auth/signup` — (exists)
- `POST /api/auth/reset-password` — (needs to be built)
- `POST /api/auth/reset-password/confirm` — (needs to be built)

## Database Tables Used
- `users` — authentication
- `contacts` — auto-created on signup
- `addresses` — default addresses on signup
