---
phase: 1
title: "Research"
status: completed
effort: "1h"
---

# Phase 1: Research

## Overview

Research completed. Key findings documented.

## Key Findings

### 1. Prisma Adapter Strategy
- `prismaAdapter(prisma, { provider: "postgresql" })` creates `user`, `session`, `account`, `verification` tables
- Coexists with existing `UserProfile` table (different table names)
- Link via matching `id` values (Better Auth user.id = UserProfile.id)

### 2. Custom Fields for Billing
- Add `tier` and `stripeCustomerId` as custom fields in Better Auth config
- Regenerate schema with `npx @better-auth/cli generate`

### 3. Callbacks for Profile Creation
```ts
callbacks: {
  async afterSignUp({ user }) {
    await prisma.userProfile.create({ data: { id: user.id, email: user.email, name: user.name } });
  }
}
```

### 4. Middleware Pattern
```ts
const session = await auth.api.getSession({ headers: request.headers });
if (!session && !isPublicRoute(pathname)) {
  return NextResponse.redirect(signInUrl);
}
```
Combined with `intlMiddleware(request)` for i18n.

### 5. Client Usage
```ts
// Sign in
authClient.signIn.email({ email, password });

// Session
const { data: session } = await authClient.getSession();

// Sign out
authClient.signOut();
```

## Unresolved Questions

1. **OAuth provider selection** — User needs to decide: Google only? GitHub? Email/password only?
2. **Email verification** — Require email verification on sign-up?
3. **Existing users** — Will there be existing Clerk users that need migration?

## Next Steps
Proceed to Phase 2.
