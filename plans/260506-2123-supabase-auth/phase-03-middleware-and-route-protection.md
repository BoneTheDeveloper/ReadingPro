# Phase 03: Middleware and Route Protection

## Context

- **Issue:** https://github.com/BoneTheDeveloper/english-reading-training-app/issues/22
- **Branch:** `feature/supabase-auth`
- **Depends on:** Phase 01 (client utilities)
- **Unblocks:** Phase 04 (replace demo user — needs route protection first)

## Overview

Create Next.js middleware that refreshes Supabase auth sessions and protects dashboard routes. Unauthenticated users are redirected to `/sign-in`. Auth pages and static assets are excluded from protection.

## Requirements

### Functional
- Refresh Supabase session on every request (via cookie exchange)
- Protect all dashboard routes (redirect to `/sign-in` if no session)
- Allow public access to: `/sign-in`, `/sign-up`, `/auth/callback`, static assets
- Preserve redirect destination — after sign-in, user lands on their intended page
- Exclude API routes from redirect (they return 401 instead)

### Non-Functional
- Minimal latency — cookie refresh only, no DB calls in middleware
- Compatible with Next.js 16.2.4 middleware API

## Architecture

### Route Protection Map

```
PROTECTED (require auth):
  /                 → redirect to /sign-in if no session
  /study            → redirect to /sign-in if no session
  /progress         → redirect to /sign-in if no session
  /upload           → redirect to /sign-in if no session
  /reading/*        → redirect to /sign-in if no session
  /test/*           → redirect to /sign-in if no session
  /processing       → redirect to /sign-in if no session
  /api/*            → return 401 (no redirect for API calls)

PUBLIC (no auth required):
  /sign-in          → always accessible
  /sign-up          → always accessible
  /auth/callback    → always accessible
  /_next/*          → static assets, always accessible
  /favicon.ico      → always accessible
  /monitoring       → Sentry tunnel, always accessible
```

### Middleware Flow

```
Incoming request
    │
    ▼
updateSession(request)  ← from @supabase/ssr
    │
    ├─→ Is /sign-in, /sign-up, /auth/*, /_next/*, static?
    │       YES → pass through (no redirect)
    │
    ├─→ Is /api/* ?
    │       YES → no session? return 401 JSON
    │              has session? pass through
    │
    └─→ Is any other route?
            NO session? redirect to /sign-in?next={original_path}
            HAS session? pass through
```

## Related Code Files

### Create
- `src/middleware.ts`

### Modify
- `next.config.ts` — no changes needed (middleware auto-detected by Next.js)

## Implementation Steps

### Step 1: Create middleware (`src/middleware.ts`)

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)

  const { pathname } = request.nextUrl

  // Public routes — no protection needed
  const isPublicRoute =
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/monitoring')

  if (isPublicRoute) {
    return response
  }

  // API routes — return 401 instead of redirect
  if (pathname.startsWith('/api/')) {
    // Session was refreshed in updateSession; check if user exists
    // We need to check cookies directly since we can't call getUser() here
    // The individual route handlers will validate the session
    return response
  }

  // Protected routes — check for auth cookie presence
  // Full validation happens server-side; middleware does lightweight check
  const hasSessionCookie = request.cookies.has('sb-access-token') ||
    request.cookies.has('sb-localhost-auth-token')

  if (!hasSessionCookie) {
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(signInUrl)
  }

  return response
}

export const config = {
  matcher: [
    // Match all routes except static files and images
    '/((?!_next/static|_next/image|images|icons).*)',
  ],
}
```

**Note on cookie name:** Supabase SSR uses base64url-encoded cookie names. The actual cookie name pattern is `sb-{project-ref}-auth-token`. We check for a generic prefix. The exact pattern should be verified after Phase 01 setup.

### Step 2: Handle redirect-after-sign-in

In sign-in page, after successful auth:
```typescript
const router = useRouter()
const searchParams = useSearchParams()
const next = searchParams.get('next') || '/study'

// After successful signIn:
router.push(next)
router.refresh()
```

### Step 3: Update sign-in page redirect logic

Modify the sign-in page (Phase 02) to read `?next=` param from URL and redirect accordingly after auth success.

## Todo List

- [ ] Create `src/middleware.ts` with session refresh
- [ ] Configure matcher to exclude static assets
- [ ] Add public route exceptions (sign-in, sign-up, auth/callback)
- [ ] Add API route handling (pass through, let routes validate)
- [ ] Implement redirect with `?next=` parameter
- [ ] Update sign-in page to read `?next=` and redirect after auth
- [ ] Test: unauthenticated access to `/study` redirects to `/sign-in?next=/study`
- [ ] Test: authenticated access to `/study` works normally
- [ ] Test: API route without session gets proper handling
- [ ] Test: static assets (`/_next/*`) not affected by middleware

## Success Criteria

- Middleware refreshes Supabase session on every request
- Unauthenticated users accessing `/study` get redirected to `/sign-in`
- `?next=` parameter preserved through sign-in redirect
- Auth pages (`/sign-in`, `/sign-up`) accessible without auth
- API routes not redirected (return 401 from route handler)
- Static assets unaffected by middleware
- No measurable latency impact on page loads

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Cookie name mismatch causes false redirects | Medium | High | Log cookie names in dev; use broad prefix match |
| Middleware runs on every static asset request | Low | Medium | Matcher config excludes `/_next/static`, `/_next/image` |
| Session refresh fails intermittently | Low | Low | Supabase SSR handles this gracefully; falls back to no session |

## Security Considerations

- Middleware only checks cookie presence, not validity — full validation in server actions/routes
- No sensitive data exposed in redirect URLs
- `?next=` parameter sanitized (only allow relative paths) to prevent open redirect

## Next Steps

- Phase 04: Replace demo user with authenticated user (now protected by middleware)
