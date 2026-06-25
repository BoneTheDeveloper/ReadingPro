# Sign In / Sign Up

## Sign Up

1. User opens `/sign-up`.
2. User fills in name, email, and password.
3. User submits the form → account is created → redirected to `/` (Dashboard).

## Sign In

1. User opens `/sign-in`.
2. User fills in email and password.
3. User submits the form → authenticated → redirected to `/` (Dashboard).
4. If the user was trying to access a protected route, they are redirected back to it after sign-in.

## Sign Out

1. User clicks the account menu in the sidebar or header.
2. User clicks **Sign out** → session is cleared → redirected to `/sign-in`.

## Routes

| Action | Route |
|--------|-------|
| Sign up | `/sign-up` |
| Sign in | `/sign-in` |
| Dashboard (post-auth landing) | `/` |
