---
phase: 2
title: "Guarded dev magic-login route"
status: pending
priority: P1
effort: "1.5h"
dependencies: [1]
---

# Phase 2: Guarded dev magic-login route

## Overview
A dev-only Next route handler that mints a Better Auth session server-side for a
chosen `email`/`tier` and returns it as an httpOnly `Set-Cookie` on a redirect to
`/`. Idempotent (find-or-create). Double-guarded so it is inert in production.

## Requirements
- Functional: `GET /api/dev/login?email=…&tier=…` → creates/reuses user, mints
  session, sets httpOnly session cookie, 302 → `/`.
- Non-functional: full auth bypass ⇒ **must** be unreachable unless explicitly
  enabled in a non-prod env. No dependence on the login UI.

## Architecture

Route imports the **test-only** `testAuth` (Phase 1) and `prisma`. Flow:

1. Guard: if `process.env.NODE_ENV === "production"` **or**
   `process.env.DEV_LOGIN_ENABLED !== "true"` → `404`.
2. Parse `email` (default `e2e@example.com`) + optional `tier` (default `FREE`).
3. `const ctx = await testAuth.$context;`
4. Idempotent user:
   - `let user = await prisma.user.findUnique({ where: { email } });`
   - if none: `user = await ctx.test.saveUser(ctx.test.createUser({ email, tier }));`
     (`createUser` spreads overrides → `tier` lands on the row; `saveUser` =
     `internalAdapter.createUser`, which throws on duplicate email — hence find-first.)
   - optional: if `user` exists and `tier` param differs, `prisma.user.update` tier.
5. Mint session: `const { headers } = await ctx.test.login({ userId: user.id });`
   (`login` creates a session row and returns `Set-Cookie` headers, already signed.)
6. Forward cookies onto a redirect:
   ```ts
   const res = NextResponse.redirect(new URL("/", req.url));
   for (const c of headers.getSetCookie()) res.headers.append("set-cookie", c);
   return res;
   ```

**Prod-bundle note (accepted trade-off):** importing `testAuth` pulls `testUtils`
into the bundle. The double guard makes the route return 404 in prod, so the code
path is unreachable. Documented consequence of reusing the dev DB; acceptable for
a dev tool.

## Related Code Files
- Create: `src/app/api/dev/login/route.ts`
- Modify: `.env.example` (add `DEV_LOGIN_ENABLED=` with a comment)

## Implementation Steps

1. Create the route:
   ```ts
   import { NextResponse } from "next/server";
   import { testAuth } from "@/lib/auth/auth.test";
   import { prisma } from "@/lib/prisma";

   export async function GET(req: Request) {
     if (
       process.env.NODE_ENV === "production" ||
       process.env.DEV_LOGIN_ENABLED !== "true"
     ) {
       return new NextResponse("Not found", { status: 404 });
     }

     const url = new URL(req.url);
     const email = url.searchParams.get("email") ?? "e2e@example.com";
     const tier = url.searchParams.get("tier") ?? "FREE";

     const ctx = await testAuth.$context;

     let user = await prisma.user.findUnique({ where: { email } });
     if (!user) {
       user = await ctx.test.saveUser(ctx.test.createUser({ email, tier }));
     } else if (user.tier !== tier) {
       user = await prisma.user.update({ where: { id: user.id }, data: { tier } });
     }

     const { headers } = await ctx.test.login({ userId: user.id });

     const res = NextResponse.redirect(new URL("/", req.url));
     for (const cookie of headers.getSetCookie()) {
       res.headers.append("set-cookie", cookie);
     }
     return res;
   }
   ```
   Notes: keep `dynamic = "force-dynamic"` if Next tries to static-optimize;
   add `export const dynamic = "force-dynamic";` if needed. `tier` is a
   `user.additionalFields`; if the Prisma `user` type doesn't expose it, cast
   narrowly or select it explicitly.

2. `.env.example`: add
   ```
   # Dev-only: enables /api/dev/login session bypass for the preview browser.
   # Leave blank in every deployed env. Never set in production.
   DEV_LOGIN_ENABLED=
   ```

3. `pnpm run typecheck` + `pnpm run lint`.

## Success Criteria
- [ ] Route file created; typecheck + lint pass.
- [ ] `headers.getSetCookie()` available (Node/undici in Next 16) — if not, fall
      back to iterating `login()`'s `cookies: TestCookie[]` via `res.cookies.set`.
- [ ] Manual reasoning check: with guard off, returns 404 (verified in Phase 3).

## Risk Assessment
- **`getSetCookie()` unavailable** on the runtime's Headers → fallback to the
  structured `cookies` array (map `sameSite` casing is already compatible).
- **`prisma.user.tier`** — VERIFIED present: `prisma/schema.prisma:64`
  (`tier String? @default("FREE")`), plus `stripeCustomerId` at :65. Raw
  `prisma.user.findUnique/update` on `tier` is safe; no adapter workaround needed.
  Valid values per `Tier` enum (:33) are `FREE` / `PREMIUM` — validate the query
  param against these before writing (reject unknown → 400) to avoid junk rows.
- **Route static-optimized** → add `force-dynamic`.
