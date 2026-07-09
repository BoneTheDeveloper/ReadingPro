---
phase: 3
title: "Middleware"
status: pending
priority: P1
effort: "15min"
dependencies: ["phase-02-install-configure"]
---

# Phase 3: Middleware

## Overview

Replace Clerk middleware (`src/proxy.ts`) with Better Auth middleware that integrates with next-intl.

## Requirements

- Functional: Protected routes redirect unauthenticated users; authenticated users redirected from auth pages
- Non-functional: next-intl locale handling preserved

## Architecture

```
src/proxy.ts → src/middleware.ts (or update proxy.ts in place)
```

Better Auth uses `auth.api.getSession({ headers })` instead of Clerk's `auth()` wrapper.

## Related Code Files

**Modify:**
- `src/proxy.ts` — Replace Clerk middleware with Better Auth + next-intl integration

## Implementation Steps

### 3.1 Replace Clerk Middleware

Update `src/proxy.ts`:

```ts
import { auth } from "@/lib/auth";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Public routes that don't require authentication
const PUBLIC_PATHS = [
  "/",
  "/sign-in",
  "/sign-up",
  "/about",
  // API paths are skipped separately
];

const isPublicRoute = (pathname: string): boolean => {
  // Direct match
  if (PUBLIC_PATHS.includes(pathname)) return true;

  // Check with locale prefix
  const localePattern = new RegExp(`^/(${routing.locales.join("|")})`);
  const pathWithoutLocale = pathname.replace(localePattern, "");

  return PUBLIC_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`)
  );
};

const isAuthPage = (pathname: string): boolean => {
  const authPaths = ["/sign-in", "/sign-up"];
  return authPaths.some((p) => pathname.startsWith(p) || pathname.startsWith(`/${routing.defaultLocale}${p}`));
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and monitoring
  if (pathname.startsWith("/api/") || pathname.startsWith("/monitoring")) {
    return NextResponse.next();
  }

  // Extract locale from pathname
  const localePattern = new RegExp(`^/(${routing.locales.join("|")})(?:/|$)`);
  const locale = pathname.match(localePattern)?.[1] ?? routing.defaultLocale;

  // Get session from Better Auth
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  // Unauthenticated user trying to access protected route
  if (!session && !isPublicRoute(pathname)) {
    const signInUrl = new URL(`/${locale}/sign-in`, request.url);
    signInUrl.searchParams.set("redirect_url", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Authenticated user on auth page → redirect to dashboard
  if (session && isAuthPage(pathname)) {
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  // Let next-intl handle locale routing
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|json|xml|txt|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

## Success Criteria

- [ ] Middleware uses `auth.api.getSession()` instead of Clerk's `auth()`
- [ ] Public routes (sign-in, sign-up, /) accessible without auth
- [ ] Protected routes redirect to sign-in with `redirect_url` param
- [ ] Authenticated users redirected away from auth pages
- [ ] next-intl locale handling preserved

## Risk Assessment

- **Risk:** Session cookie name/format differs between Clerk and Better Auth
- **Mitigation:** Test that existing Clerk sessions are invalidated and Better Auth sessions work

## Next Steps

Proceed to Phase 4: Auth Server (API routes)
