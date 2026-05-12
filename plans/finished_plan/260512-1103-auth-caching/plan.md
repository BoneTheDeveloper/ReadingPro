# Auth Caching Plan

## Problem
Every request calls `supabase.auth.getUser()` + `ensureProfile()` DB query via `getAuthenticatedUser()`. Logs show 300-1300ms application-code latency per request, dominated by auth overhead. A single page load can trigger 2-3 auth calls (server component + API routes).

## Solution
Per-request caching using Node.js `AsyncLocalStorage`. Caches the auth result within a single request so multiple `getAuthenticatedUser()` calls in the same request tree only hit Supabase once. Automatically clears between requests — no TTL, no stale data, no cross-request leakage.

## Scope
- `src/lib/auth/auth-utils.ts` — add AsyncLocalStorage cache around `getCurrentUser()`
- `src/app/(dashboard)/*/page.tsx` (5 server components) — wrap page render in auth cache context
- No changes to API routes or server actions (they run in isolated request contexts)

## Callers (15 total)
- **Server Components** (5): study, reading/[id], test/[id], progress, upload
- **API Routes** (5): cards/due, cards/review, progress/stats, study-session, upload
- **Server Actions** (5): analyze, study-upload, study-simplify, study-generate-questions, study-delete-passage

Server components within a page can make multiple auth calls (page + nested API fetches). API routes and server actions each run in their own request context — they still benefit from the cache if called multiple times within the same request (e.g., action calling `getAuthenticatedUser()` twice).

## Implementation

### Phase 1: Auth cache module
Create `src/lib/auth/auth-cache.ts`:
- `AuthCacheStore` class with `AsyncLocalStorage` backing
- `getUserId()` / `setUser()` / `clear()`
- `withAuthCache()` wrapper that initializes store for a request

### Phase 2: Integrate into auth-utils.ts
- Import cache store in `getCurrentUser()`
- Check cache before calling `supabase.auth.getUser()`
- Store result after `ensureProfile()`

### Phase 3: Server component integration
- Create `withAuth()` HOC for server components
- Wrap the 5 dashboard page components

## Risk: LOW
- AsyncLocalStorage is stable in Node.js 16+ and Next.js
- Cache is per-request only — no cross-request state
- Fallback: if no cache context, behaves exactly as before (no caching)
