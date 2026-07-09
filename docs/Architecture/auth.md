# Authentication Architecture

## Overview

Authentication is handled by **Better Auth** — a self-hosted auth framework providing email/password and OAuth authentication with session management.

## Stack

| Component | Technology |
|-----------|------------|
| Auth Framework | [Better Auth](https://better-auth.com) v1.6.x |
| Database Adapter | `@better-auth/adapters/prisma` |
| Client | `@better-auth/react` (built-in hooks) |
| Session Storage | PostgreSQL (via Prisma) |
| OAuth Provider | Google (configurable) |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │ AuthControls     │    │ SignInForm       │                   │
│  │ (authClient.    │    │ SignUpForm       │                   │
│  │  useSession)    │    │                  │                   │
│  └────────┬────────┘    └────────┬────────┘                   │
│           │                       │                             │
│           │    authClient         │                             │
│           ▼                       ▼                             │
│  ┌─────────────────────────────────────────────┐               │
│  │         /api/auth/[...all]                  │               │
│  │  POST /sign-in  GET /session  POST /sign-out │            │
│  └─────────────────────┬───────────────────────┘               │
└────────────────────────┼───────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Server Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐               │
│  │          auth.ts (Better Auth)            │               │
│  │  - emailAndPassword                       │               │
│  │  - socialProviders.google                │               │
│  │  - callbacks: afterSignUp, afterSignIn    │               │
│  └─────────────────────┬───────────────────┘               │
│                        │                                     │
│                        ▼                                     │
│  ┌─────────────────────────────────────────────┐               │
│  │          Prisma Adapter                     │               │
│  │  - prismaAdapter(prisma, { provider })    │               │
│  └─────────────────────┬───────────────────────┘               │
│                        │                                     │
│                        ▼                                     │
│  ┌─────────────────────────────────────────────┐               │
│  │          PostgreSQL                         │               │
│  │  Tables: user, session, account,            │               │
│  │          verification                      │               │
│  └─────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/
├── lib/
│   ├── auth.ts           # Better Auth server instance
│   ├── auth-client.ts    # Client auth + useSession hook
│   └── auth-server.ts    # Server utilities (getUserId, getCurrentUser)
├── components/
│   ├── auth/
│   │   ├── sign-in-form.tsx
│   │   └── sign-up-form.tsx
│   └── layout/
│       └── auth-controls.tsx
└── proxy.ts              # Middleware for route protection
```

## Database Schema

Better Auth manages four tables for authentication:

| Table | Purpose |
|-------|---------|
| `user` | Stores user credentials, profile, custom fields (tier, stripeCustomerId) |
| `session` | Active user sessions with expiry |
| `account` | OAuth provider links (Google, etc.) |
| `verification` | Email verification and password reset tokens |

### Relationship with App Data

```
Better Auth User ────────── App UserProfile
        │                        │
        │  same id                │
        ▼                        ▼
    ┌────────┐              ┌───────────┐
    │  id    │◄─────────────│    id    │
    │ email  │              │   email  │
    │ image  │              │  avatarUrl│
    │  tier  │              │   tier   │  (synced)
    └────────┘              └───────────┘
```

The `User.id` matches `UserProfile.id` — they are linked by the same value, not a foreign key.

## Session Flow

### 1. Sign Up
```ts
authClient.signUp.email({ email, password, name })
  → POST /api/auth/sign-up
    → Creates user in `user` table
    → Creates UserProfile via afterSignUp callback
    → Creates session cookie
    → Redirect to dashboard
```

### 2. Sign In
```ts
authClient.signIn.email({ email, password })
  → POST /api/auth/sign-in
    → Validates credentials
    → Ensures UserProfile via afterSignIn callback
    → Creates session
    → Redirect to dashboard
```

### 3. OAuth (Google)
```ts
authClient.signIn.social({ provider: "google" })
  → Redirect to Google OAuth
    → Callback to /api/auth/callback/google
    → Creates/links account in `account` table
    → Creates/updates user via afterSignUp/afterSignIn
    → Redirect to dashboard
```

### 4. Sign Out
```ts
authClient.signOut()
  → POST /api/auth/sign-out
    → Deletes session
    → Clears cookie
    → Redirect to home
```

## Route Protection

The `proxy.ts` middleware handles route protection:

```ts
// 1. Check if public route
if (isPublicRoute(pathname)) return NextResponse.next();

// 2. Get session from Better Auth
const session = await auth.api.getSession({ headers });

// 3. Redirect if not authenticated
if (!session) return NextResponse.redirect("/sign-in");

// 4. Let next-intl handle locale
return intlMiddleware(request);
```

### Public Routes
- `/` (home)
- `/sign-in`
- `/sign-up`
- `/about`
- `/api/*` (API routes)
- `/monitoring` (Sentry)

## Client Session Hook

Better Auth provides a built-in React hook via `@better-auth/react`:

```tsx
import { authClient } from "@/lib/auth-client";

function AuthControls() {
  const { data: session, isPending: loading } = authClient.useSession();

  if (loading) return <Skeleton />;
  if (!session?.user) return <SignInButton />;

  return <UserButton user={session.user} />;
}
```

### Using signIn/signUp (if needed)
```tsx
import { authClient } from "@/lib/auth-client";

async function handleSignIn(email: string, password: string) {
  const { data, error } = await authClient.signIn.email({
    email,
    password,
  });

  if (error) {
    console.error(error.message);
    return;
  }

  // Success - redirect handled by onSuccess callback or manually
  router.push("/dashboard");
}
```

## Server-Side Auth

For Server Components and Server Actions:

```tsx
import { getUserId, getCurrentUser } from "@/lib/auth-server";

export default async function DashboardPage() {
  // Throws if not authenticated
  const userId = await getUserId();

  // Returns UserProfile or null
  const user = await getCurrentUser();

  return <Dashboard user={user} />;
}
```

## Environment Variables

```env
# Required
BETTER_AUTH_SECRET=<32+ char random secret>
BETTER_AUTH_URL=http://localhost:3000

# OAuth (optional)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
```

## Security Considerations

1. **Session cookies** — HttpOnly, secure in production
2. **CSRF protection** — Built into Better Auth
3. **Rate limiting** — Built-in for auth endpoints
4. **Password hashing** — Argon2 by default
5. **OAuth state** — PKCE + state parameter validation

## Migration Notes

### From Clerk
- Clerk user IDs are **not** compatible with Better Auth IDs
- Existing users must re-register (clean slate migration)
- `UserProfile.id` now references Better Auth's `User.id`
- Custom fields (tier, stripeCustomerId) moved to Better Auth's `User` table

### Breaking Changes
- `auth.protect()` → `getUserId()` (throws, must be caught)
- `<ClerkProvider>` → Removed (next-intl only)
- `<SignInButton>` → Custom `SignInForm` component
- `<UserButton>` → Custom dropdown with `authClient.useSession()`
- Custom `useSession` hook → Built-in `authClient.useSession()`
