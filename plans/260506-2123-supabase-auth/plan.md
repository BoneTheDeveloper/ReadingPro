---
title: "Implement Authentication with Supabase Auth"
description: "Replace hardcoded demo user with Supabase Auth (email/password + Google OAuth), add middleware route protection, auth pages, and session-based user context across all actions and routes"
status: complete
priority: P0
effort: 14h
branch: feature/supabase-auth
tags: [authentication, supabase, auth, oauth, middleware, security]
created: 2026-05-06
---

## Issue

GitHub: https://github.com/BoneTheDeveloper/english-reading-training-app/issues/22

## Dependency

**No blockers** — can start independently. **Blocks Issue #23** (Database migration to Supabase PostgreSQL). RLS policies in the DB migration require authenticated user context (`auth.uid()`). Auth must ship first.

## Research Findings

### Current State

| Aspect | Current | Target |
|--------|---------|--------|
| Auth | None — hardcoded `demo@example.com` | Supabase Auth (email/password + Google OAuth) |
| User session | `getOrCreateDemoUser()` in every action/route | Cookie-based session via `@supabase/ssr` |
| Route protection | None — all pages publicly accessible | Middleware redirects unauthenticated users |
| Auth UI | No sign-in/sign-up pages, placeholder user in sidebar | `/sign-in`, `/sign-up`, user menu, sign-out |
| User model | Prisma `User` with `id`, `email`, `name`, `targetLevel` | Synced with Supabase Auth on first sign-up |

### Demo User Pattern (4 locations)

| File | Pattern | Race-safe? |
|------|---------|-----------|
| `src/app/actions/study-shared.ts` | `getOrCreateDemoUser()` — `findUnique` + `create` | NO |
| `src/app/actions/study-upload-action.ts` | Imports `getOrCreateDemoUser()` | Indirect |
| `src/app/actions/analyze.ts` | Imports `getOrCreateDemoUser()` | Indirect |
| `src/app/api/cards/due/route.ts` | Inline `db.user.upsert(...)` | YES |
| `src/app/api/progress/stats/route.ts` | Inline `db.user.upsert(...)` | YES |
| `src/app/api/study-session/route.ts` | Inline `findUnique` + `create` | NO |

All 6 locations replaced with a single `getAuthenticatedUser()` helper using Supabase session.

### Missing Ownership Checks

These files operate on resource IDs without verifying user ownership:
- `src/app/actions/study-simplify-action.ts` — passageId, no userId check
- `src/app/actions/study-generate-questions-action.ts` — passageId, no userId check
- `src/app/api/study-session/route.ts` PATCH — sessionId, no userId check
- `src/app/api/cards/review/route.ts` POST — cardReviewId, no userId check

### Auth Package Strategy

Use `@supabase/ssr` (NOT the deprecated `@supabase/auth-helpers-nextjs`):
- `createBrowserClient` for client components
- `createServerClient` for server components, server actions, API routes, middleware
- Cookie-based PKCE flow — no `localStorage`, works with SSR

### User Sync Pattern

Supabase Auth manages credentials. Local `users` table stores app-specific profile data. On first sign-up, a database trigger or a server-side check creates the `users` row keyed by Supabase Auth `uuid` as the primary key.

**Important:** Current `User.id` uses CUID. After migration, `User.id` will be the Supabase Auth UUID. This is a breaking change that affects all foreign keys — handled in Issue #23 (DB migration). For this phase, we keep CUID and store the Supabase user ID separately, or defer the ID change to the DB migration phase.

**Decision:** Add `supabaseAuthId` column to `users` table (nullable, unique). Keep CUID as PK for backward compatibility. The DB migration (Issue #23) will swap to UUID PK. This avoids a dual-breaking-change scenario.

## Phases

| Phase | Description | Status | Effort | Blocked By |
|-------|-------------|--------|--------|------------|
| [01](phase-01-package-setup-and-client-utils.md) | Install packages, create Supabase client utilities, add env vars | **done** | 2h | none |
| [02](phase-02-auth-pages.md) | Build sign-in and sign-up pages with email/password + Google OAuth | pending | 3h | Phase 01 |
| [03](phase-03-middleware-and-route-protection.md) | Next.js middleware for session refresh and route protection | pending | 2h | Phase 01 |
| [04](phase-04-replace-demo-user.md) | Replace demo user with authenticated user in all actions/routes | **deferred** | 4h | Phase 01, Phase 03 |
| [05](phase-05-ui-updates.md) | User menu in sidebar, sign-out button, auth state indicator | **done** | 2h | Phase 01 |
| [06](phase-06-testing-validation.md) | End-to-end auth flow validation | **done** | 1h | All prior phases |

## Dependency Graph

```
Phase 01 (Package setup + client utils)
    ├──> Phase 02 (Auth pages) ─────────────────────────────┐
    ├──> Phase 03 (Middleware) ──────────────────────────────┤
    ├──> Phase 04 (Replace demo user) ── requires Phase 03 ─┤
    └──> Phase 05 (UI updates) ─────────────────────────────┤
                                                              │
                                              Phase 06 (Testing) <┘
```

Phases 02, 03, 04, 05 can proceed in parallel after Phase 01 completes. Phase 04 ideally waits for Phase 03 (middleware) so route protection is in place before switching user context.

## File Ownership Per Phase

| Phase | Files Modified | Files Created | Files Deleted |
|-------|---------------|---------------|---------------|
| 01 | `package.json`, `.env.example` | `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts` | none |
| 02 | `prisma/schema.prisma` (add `supabaseAuthId`) | `src/app/(auth)/sign-in/page.tsx`, `src/app/(auth)/sign-up/page.tsx`, `src/app/(auth)/layout.tsx`, `src/app/auth/callback/route.ts` | none |
| 03 | `next.config.ts` (middleware matcher) | `src/middleware.ts` | none |
| 04 | `src/app/actions/study-shared.ts`, `src/app/actions/study-upload-action.ts`, `src/app/actions/analyze.ts`, `src/app/actions/study-simplify-action.ts`, `src/app/actions/study-generate-questions-action.ts`, `src/app/api/cards/due/route.ts`, `src/app/api/progress/stats/route.ts`, `src/app/api/study-session/route.ts`, `src/app/api/cards/review/route.ts` | `src/lib/auth/get-auth-user.ts` | none |
| 05 | `src/components/dashboard-sidebar.tsx` | `src/components/user-menu.tsx`, `src/components/ui/dropdown-menu.tsx`, `src/components/sign-out-button.tsx`, `src/hooks/use-sign-out.ts` | none |
| 06 | none | test files | none |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `@supabase/ssr` cookie handling breaks in Next.js 16.2.4 | Low | High | Test cookie flow early in Phase 01; check for breaking changes in @supabase/ssr changelog |
| Google OAuth misconfiguration (callback URL) | Medium | Medium | Document exact callback URL; test with Supabase local dev first |
| User sync race condition on first sign-up | Medium | Medium | Use `upsert` keyed on `supabaseAuthId`; add unique constraint |
| Middleware performance impact (session refresh on every request) | Low | Low | Supabase SSR handles this efficiently; cookie-based, no network call for valid sessions |
| Breaking existing flows during demo user removal | High | High | Phase 04 is the riskiest — test each action independently; keep demo fallback for dev mode |

## Rollback Plan

- Phase 01: Remove packages, delete client utils
- Phase 02: Delete auth pages, revert schema change
- Phase 03: Delete middleware
- Phase 04: Revert action/route changes to demo user pattern
- Phase 05: Revert sidebar changes
- Phase 06: No code changes

## Success Criteria

- [ ] Users can sign up with email/password and are redirected to dashboard
- [ ] Users can sign in with email/password
- [ ] Users can sign in with Google OAuth
- [ ] Unauthenticated users are redirected to `/sign-in` for protected routes
- [ ] Session persists across page navigation and browser refresh
- [ ] Sign-out clears session and redirects to `/sign-in`
- [ ] All existing features (upload, simplify, generate questions, study, progress) work with authenticated user
- [ ] No `demo@example.com` references remain in source code
- [ ] `supabaseAuthId` column in `users` table correctly synced on first sign-up
- [ ] Ownership checks added to simplify, generate-questions, session PATCH, card review routes
