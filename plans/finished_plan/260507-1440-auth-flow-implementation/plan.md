---
title: "Auth Flow Implementation (Phases 02 + 03 + 05)"
description: "Focused implementation of the main auth flow: sign-in/sign-up pages, middleware route protection, and user menu UI. Skips demo user replacement (Phase 04) and testing (Phase 06)."
status: pending
priority: P0
effort: 7h
branch: feature/supabase-auth
tags: [authentication, supabase, auth, oauth, middleware, ui]
created: 2026-05-07
parent: ../260506-2123-supabase-auth/plan.md
---

## Scope

Focused auth flow covering:
- **Phase 02** — Auth pages (sign-in, sign-up, Google OAuth, callback)
- **Phase 03** — Middleware (session refresh, route protection)
- **Phase 05** — UI updates (user menu, sign-out)

**Out of scope (deferred):**
- Phase 04 — Replace demo user in actions/routes
- Phase 06 — End-to-end testing

## Prerequisites

- Phase 01 complete: `@supabase/supabase-js`, `@supabase/ssr` installed
- Supabase client utilities exist at `src/lib/supabase/{client,server,middleware}.ts`
- `.env` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Implementation Order

```
Step 1: Prisma schema update (supabaseAuthId) + migration
Step 2: sync-user utility
Step 3: Auth layout + sign-in page
Step 4: Sign-up page
Step 5: OAuth callback route
Step 6: Middleware (route protection)
Step 7: User menu component + sidebar integration
Step 8: Build verification
```

Steps 1-2 setup the data layer. Steps 3-5 are the auth pages. Step 6 is middleware. Step 7 is UI. Step 8 is verification.

## File Changes Summary

### Modify
- `prisma/schema.prisma` — add `supabaseAuthId` column
- `src/components/dashboard-sidebar.tsx` — replace placeholder with UserMenu
- `src/app/page.tsx` — replace placeholder with UserMenu

### Create
- `src/lib/auth/sync-user.ts`
- `src/app/(auth)/layout.tsx`
- `src/app/(auth)/sign-in/page.tsx`
- `src/app/(auth)/sign-up/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/middleware.ts`
- `src/components/user-menu.tsx`

### Install
- `npx shadcn@latest add dropdown-menu` (if not present)

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth route group | `(auth)` | Separate from `(dashboard)`, no sidebar |
| OAuth redirect | `/auth/callback` | Standard Supabase SSR pattern |
| User sync | Server-side `upsert` in callback | Race-safe with unique constraint |
| Middleware cookie check | Generic `sb-` prefix | Avoids hardcoding project ref |
| Sign-in redirect | `?next=` param | Preserves user's intended destination |

## Detailed Steps

See parent plan for full phase specs:
- [Phase 02: Auth Pages](../260506-2123-supabase-auth/phase-02-auth-pages.md)
- [Phase 03: Middleware](../260506-2123-supabase-auth/phase-03-middleware-and-route-protection.md)
- [Phase 05: UI Updates](../260506-2123-supabase-auth/phase-05-ui-updates.md)

## Success Criteria

- `/sign-in` renders with email/password form and Google OAuth button
- `/sign-up` renders with email/password/confirm form and Google OAuth button
- Email/password sign-up creates Supabase Auth user + local `users` row
- Google OAuth sign-in creates Supabase Auth user + local `users` row
- Successful auth redirects to `/study`
- Unauthenticated access to protected routes redirects to `/sign-in`
- TopBar shows real user name/email (not "Placeholder")
- Sign-out clears session and redirects to `/sign-in`
- `npm run build` passes
