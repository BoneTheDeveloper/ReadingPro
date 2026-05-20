---
phase: 2
title: "Next Intl Routing"
status: complete
priority: P1
effort: "4h"
dependencies: [1]
---

# Phase 2: Next Intl Routing

## Overview

Install and configure `next-intl` with English and Vietnamese route prefixes while preserving Supabase auth protection.

## Requirements

- Functional: support `en` and `vi`, default `en`.
- Functional: locale-prefixed routes work for dashboard, auth, upload, study, reading, test, progress, and processing pages.
- Functional: `/` redirects or resolves to the default locale.
- Non-functional: protected routes remain protected, auth callback still works, APIs remain unlocalized.

## Architecture

Use the current Next.js 16 `proxy.ts` convention:

- Add `src/i18n/routing.ts` with `defineRouting({locales: ["en", "vi"], defaultLocale: "en"})`.
- Add `src/i18n/navigation.ts` using `createNavigation(routing)`.
- Add `src/i18n/request.ts` using `getRequestConfig`.
- Move UI route groups under `src/app/[locale]/`.
- Keep API routes and auth callback paths outside `[locale]` if they are not user-facing.
- Compose `createMiddleware(routing)` with current Supabase proxy logic.

## Related Code Files

- Modify: `package.json`, `pnpm-lock.yaml`
- Create: `src/i18n/routing.ts`
- Create: `src/i18n/navigation.ts`
- Create: `src/i18n/request.ts`
- Create: `messages/en.json`
- Create: `messages/vi.json`
- Modify: `next.config.ts`
- Modify: `src/proxy.ts`
- Move/modify: `src/app/page.tsx`, `src/app/(auth)/*`, `src/app/(dashboard)/*`
- Modify: `src/app/layout.tsx`

## Implementation Steps

1. Install `next-intl`.
2. Wrap Next config with `createNextIntlPlugin`.
3. Add routing, navigation, and request config modules.
4. Move user-facing pages/layouts into `src/app/[locale]/`.
5. Update `RootLayout` to keep global fonts and theme shell; add locale layout with `NextIntlClientProvider`.
6. Update links/imports from `next/link` and `next/navigation` to locale-aware wrappers where route locale matters.
7. Compose locale middleware and Supabase auth logic in `src/proxy.ts`.
8. Ensure auth redirects include locale-aware `/sign-in` and post-login destinations.

## Success Criteria

- [x] `/en`, `/vi`, `/en/study`, `/vi/study`, `/en/sign-in`, `/vi/sign-in` render.
- [x] APIs under `/api/*` are untouched by locale routing.
- [x] Supabase auth callback remains functional.
- [x] Unauthenticated protected routes redirect to localized sign-in.
- [x] Current locale is reflected in `<html lang>`.

## Risk Assessment

Risk: moving routes under `[locale]` can break relative imports and route assumptions.
Mitigation: move one route group at a time, then run type checks.

Risk: proxy composition can drop Supabase cookies.
Mitigation: keep one response object as the cookie carrier and test sign-in/sign-out manually.
