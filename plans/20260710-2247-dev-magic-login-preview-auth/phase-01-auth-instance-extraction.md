---
phase: 1
title: "Auth options extraction + test-only instance"
status: pending
priority: P1
effort: "1h"
dependencies: []
---

# Phase 1: Auth options extraction + test-only instance

## Overview
Extract the shared `BetterAuthOptions` into a `server-only`-free module so a
test-only Better Auth instance (with the `testUtils` plugin) can be created
without duplicating config or breaking Node imports. Production `auth.ts`
behavior stays identical.

## Requirements
- Functional: `auth.test.ts` exposes `ctx.test.*` helpers; production `auth` unchanged.
- Non-functional: no `server-only` in the shared options or test instance (they
  may be imported from a plain-Node/route context); DRY — one options source, so
  cookie name/flags and `additionalFields` (tier, stripeCustomerId) match between
  instances (required for the minted session to validate against production auth).

## Architecture
Current `auth.ts` inlines the options object in the `betterAuth({...})` call and
imports `server-only`. Split:

- `auth-options.ts` — exports the plain options object. **No `server-only`.**
  Imports only `prisma` + `prismaAdapter` + types. (Prisma client itself is not
  `server-only`; safe to import from a route.)
- `auth.ts` — keeps `import "server-only"`, imports `authOptions`, calls
  `betterAuth(authOptions)`. Same runtime object as before.
- `auth.test.ts` — no `server-only`; `betterAuth({ ...authOptions, plugins: [ ...(authOptions.plugins ?? []), testUtils() ] })`.

Session validity across instances = DB-backed session row + shared
`BETTER_AUTH_SECRET`. Identical `additionalFields` ensures `tier` persists.

## Related Code Files
- Create: `src/lib/auth/auth-options.ts`
- Create: `src/lib/auth/auth.test.ts`
- Modify: `src/lib/auth/auth.ts`

## Implementation Steps

1. **`src/lib/auth/auth-options.ts`** — move the current options object here:
   ```ts
   import { type BetterAuthOptions } from "better-auth";
   import { prismaAdapter } from "better-auth/adapters/prisma";
   import { prisma } from "@/lib/prisma";

   export const authOptions = {
     database: prismaAdapter(prisma, { provider: "postgresql" }),
     emailAndPassword: { enabled: true, requireEmailVerification: false },
     socialProviders: {
       google: {
         clientId: process.env.GOOGLE_CLIENT_ID ?? "",
         clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
       },
     },
     user: {
       additionalFields: {
         tier: { type: "string", required: false, defaultValue: "FREE" },
         stripeCustomerId: { type: "string", required: false },
       },
     },
   } satisfies BetterAuthOptions;
   ```

2. **`src/lib/auth/auth.ts`** — reduce to:
   ```ts
   import "server-only";
   import { betterAuth } from "better-auth";
   import { authOptions } from "./auth-options";

   export const auth = betterAuth(authOptions);
   export type Auth = typeof auth;
   ```

3. **`src/lib/auth/auth.test.ts`** — test-only instance:
   ```ts
   import { betterAuth } from "better-auth";
   import { testUtils } from "better-auth/plugins";
   import { authOptions } from "./auth-options";

   // No "server-only": importable from route/Node contexts.
   // NEVER import this from app runtime code — dev/login route only.
   export const testAuth = betterAuth({
     ...authOptions,
     plugins: [...(authOptions.plugins ?? []), testUtils()],
   });
   ```

4. Run `pnpm run typecheck`. Confirm `betterAuth(authOptions)` still infers the
   same `Auth` type (no `satisfies` widening surprises). If `plugins` typing on
   the spread complains, keep the `...(authOptions.plugins ?? [])` guard.

## Success Criteria
- [ ] `auth-options.ts`, `auth.test.ts` created; `auth.ts` slimmed.
- [ ] `typecheck` passes; `Auth` type unchanged for existing importers.
- [ ] `getSession()` / `getUserId()` in `auth-server.ts` still compile & behave same.
- [ ] `testAuth.$context` resolves with `ctx.test` typed (spot-check in route in Phase 2).

## Risk Assessment
- **Type drift on `betterAuth(authOptions)`** vs previous inline object → mitigate
  with `satisfies BetterAuthOptions` on `authOptions`; verify `Auth` type via typecheck.
- **`ctx.test` inference loss** if plugin spread confuses TS (per Better Auth docs).
  Separate instance already avoids the worst case; if inference drops, cast the
  helper access in the route rather than adding testUtils to prod auth.
