# Locale Routing

## Overview

User-facing pages are nested under `src/app/[locale]`. The supported locale segment is validated by `src/app/[locale]/layout.tsx` and configured in `src/i18n/routing.ts`.

Current locale segments:

| Segment | Locale |
|---------|--------|
| `/en` | English |
| `/vi` | Vietnamese |

## Route Structure

```text
src/app
+-- [locale]
|   +-- layout.tsx
|   +-- page.tsx
|   +-- (auth)
|   |   +-- layout.tsx
|   |   +-- sign-in/page.tsx
|   |   +-- sign-up/page.tsx
|   +-- (dashboard)
|       +-- layout.tsx
|       +-- study/page.tsx
|       +-- upload/page.tsx
|       +-- progress/page.tsx
|       +-- reading/[id]/page.tsx
|       +-- test/[id]/page.tsx
+-- api
```

## Public And Protected Paths

| Path | Auth requirement | Notes |
|------|------------------|-------|
| `/{locale}/sign-in` | Public | Redirects authenticated users to `/{locale}`. |
| `/{locale}/sign-up` | Public | Redirects authenticated users to `/{locale}`. |
| `/{locale}` | Protected | Dashboard home. |
| `/{locale}/study` | Protected | Study workspace. |
| `/{locale}/upload` | Protected | Upload entry point. |
| `/{locale}/progress` | Protected | Currently redirects to dashboard. |
| `/{locale}/reading/{id}` | Protected | Reading view for a saved passage. |
| `/{locale}/test/{id}` | Protected | Flashcard test for a saved passage. |
| `/__clerk/*` | Clerk internal | Skipped by locale middleware. |
| `/api/*` | API | Skipped by locale middleware and handled by route code. |
| `/monitoring` | Sentry tunnel | Skipped by locale middleware. |

## Middleware Behavior

`src/proxy.ts` is the routing gate for user-facing requests.

```text
request path
  -> skip API, _next, favicon, monitoring, Clerk internals
  -> read Clerk session
  -> if authenticated and on auth page, redirect to /{locale}
  -> if unauthenticated and on protected page, redirect to /{locale}/sign-in?redirect_url={url}
  -> otherwise run next-intl middleware and return the localized response
```

Locale selection for auth redirects is derived from the current path:

- If the path starts with `/en` or `/vi`, that locale is reused.
- If no supported locale segment is present, the default locale from `routing.defaultLocale` is used.

## Navigation Rules

- Import links and routing hooks from `@/i18n/navigation` for user-facing pages.
- Use unprefixed hrefs with the app helpers, for example `href="/study"` instead of `href="/en/study"`.
- Use `router.replace(pathname, { locale: newLocale })` to switch language while staying on the same logical route.
- Preserve route params in page components; `[locale]` is handled by the layout and next-intl navigation layer.
- API routes, Clerk internal routes, and monitoring routes should not use locale-prefixed paths unless they intentionally return a localized UI redirect.

## Language Switcher

`src/ui/layout/language-switcher.tsx` reads the current locale with `useLocale()`, reads the logical pathname with `usePathname()`, and replaces the route with the selected locale:

```tsx
router.replace(pathname, { locale: newLocale });
```

The switcher uses `routing.locales`, so adding a locale to `routing.ts` automatically adds it to the menu. Add a matching label in `localeLabels` at the same time.

## Adding A Locale

1. Add the locale code to `src/i18n/routing.ts`.
2. Add `localization/messages/{locale}.json` with the same key structure as `localization/messages/en.json`.
3. Add a label to `localeLabels` in `src/ui/layout/language-switcher.tsx`.
4. Update the locale extraction in `src/proxy.ts` if it still uses a manual regex.
5. Confirm fonts in `src/app/[locale]/layout.tsx` support the new language's script.
6. Run a key parity check between all message catalogs.
7. Test unauthenticated redirects, authenticated auth-page redirects, language switching, and direct deep links.

## Edge Cases To Test

- Visiting `/` while signed out redirects to the default locale sign-in page.
- Visiting `/vi/study` while signed out redirects to `/vi/sign-in?redirect_url={absolute-url}`.
- Visiting `/en/sign-in` while signed in redirects to `/en`.
- Switching language on `/en/study` lands on `/vi/study`.
- Invalid locale params that reach the locale layout render not-found from `src/app/[locale]/layout.tsx`.
- Clerk sign-in success redirects to the `redirect_url` value set by `src/proxy.ts`.

## References

- `src/i18n/routing.ts`
- `src/i18n/navigation.ts`
- `src/proxy.ts`
- `src/app/[locale]/layout.tsx`
- `src/ui/layout/language-switcher.tsx`
