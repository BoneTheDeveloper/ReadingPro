---
phase: 2
title: "Install & Configure"
status: pending
priority: P1
effort: "30min"
dependencies: ["phase-01-research"]
---

# Phase 2: Install & Configure

## Overview

Install `better-auth` and `@better-auth/adapters/prisma`, add env vars, and scaffold the auth configuration file.

## Requirements

- Functional: Package installed, env vars set, auth instance created
- Non-functional: TypeScript compiles without errors

## Architecture

```
src/lib/auth.ts          # Server auth instance (betterAuth)
src/lib/auth-client.ts   # Client auth client (createAuthClient)
```

## Related Code Files

**Create:**
- `src/lib/auth.ts` — Server-side Better Auth instance with Prisma adapter
- `src/lib/auth-client.ts` — Client-side auth client

**Modify:**
- `.env.local` — Remove Clerk vars, add Better Auth vars

**Delete (later):**
- `src/services/clerk.ts` — Replaced by `src/lib/auth.ts`

## Implementation Steps

### 2.1 Install Dependencies

```bash
pnpm add better-auth
```

Better Auth's Prisma adapter ships with the main package.

### 2.2 Add Environment Variables

Edit `.env.local`:

```env
# Remove Clerk vars:
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# CLERK_SECRET_KEY
# CLERK_WEBHOOK_SIGNING_SECRET

# Add Better Auth:
BETTER_AUTH_SECRET=generate-32-char-random-secret-here
BETTER_AUTH_URL=http://localhost:3000

# OAuth (Google):
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Generate secret:
```bash
openssl rand -base64 32
```

### 2.3 Create Auth Server Instance

Create `src/lib/auth.ts`:

```ts
import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set true for production
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  user: {
    additionalFields: {
      tier: {
        type: "string",
        required: false,
        defaultValue: "FREE",
      },
      stripeCustomerId: {
        type: "string",
        required: false,
      },
    },
  },
  callbacks: {
    async afterSignUp({ user }) {
      // Create UserProfile for your app
      await prisma.userProfile.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          avatarUrl: user.image ?? null,
        },
      });
    },
    async afterSignIn({ user }) {
      // Ensure UserProfile exists (for OAuth sign-ins)
      await prisma.userProfile.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          avatarUrl: user.image ?? null,
        },
      });
    },
  },
});
```

### 2.4 Create Auth Client

Create `src/lib/auth-client.ts`:

```ts
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
});
```

## Success Criteria

- [ ] `better-auth` installed in package.json
- [ ] `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` in `.env.local`
- [ ] `src/lib/auth.ts` exports `auth` instance
- [ ] `src/lib/auth-client.ts` exports `authClient`
- [ ] TypeScript compiles without errors

## Risk Assessment

- **Risk:** TypeScript types may conflict if multiple auth packages installed
- **Mitigation:** Remove `@clerk/nextjs` only after migration complete (Phase 9)

## Next Steps

Proceed to Phase 3: Middleware
