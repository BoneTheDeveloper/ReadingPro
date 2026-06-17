# I18n Architecture

## Overview

The app uses `next-intl` with the Next.js App Router. User-facing pages live under the locale segment in `src/app/[locale]`, messages live in top-level JSON catalogs under `localization/messages/`, and locale-aware navigation is centralized in `src/i18n/`.

Current locales:

| Locale | Purpose | Catalog |
|--------|---------|---------|
| `en` | Default English UI | `localization/messages/en.json` |
| `vi` | Vietnamese UI | `localization/messages/vi.json` |

## Source Of Truth

| Concern | File | Notes |
|---------|------|-------|
| Supported locales and default locale | `src/i18n/routing.ts` | Defines `["en", "vi"]` and default `en`. |
| Request-time locale and messages | `src/i18n/request.ts` | Validates `requestLocale` with `hasLocale` and imports `localization/messages/{locale}.json`. |
| Locale-aware navigation helpers | `src/i18n/navigation.ts` | Exports `Link`, `redirect`, `usePathname`, `useRouter`, and `getPathname`. |
| Next.js plugin wiring | `next.config.ts` | Wraps config with `createNextIntlPlugin("./src/i18n/request.ts")`. |
| Middleware and auth redirects | `src/proxy.ts` | Runs Clerk middleware, applies locale-aware auth redirects, then returns the next-intl response. |
| Locale layout/provider | `src/app/[locale]/layout.tsx` | Validates locale, calls `setRequestLocale`, loads messages, and wraps children in `NextIntlClientProvider`. |

## Request Flow

```text
Browser request
  -> src/proxy.ts
    -> skip API, Next internals, monitoring, favicon, Clerk internals
    -> read Clerk auth session
    -> redirect auth/protected pages with locale prefix when needed
    -> run next-intl middleware with routing config
  -> src/app/[locale]/layout.tsx
    -> reject unsupported locale with notFound()
    -> setRequestLocale(locale)
    -> getMessages()
    -> render NextIntlClientProvider
  -> page/component
    -> use getTranslations() on the server
    -> use useTranslations() on the client
```

## Server And Client Translation Pattern

Server components and layouts use `getTranslations` from `next-intl/server`.

```tsx
const t = await getTranslations("Dashboard");
const title = t("studyDashboard");
```

Client components use `useTranslations` from `next-intl`.

```tsx
const t = useTranslations("Study");
return <span>{t("uploadText")}</span>;
```

When a component needs keys from multiple namespaces, call `useTranslations()` without a namespace and use fully qualified keys such as `t("Common.loading")`.

## Message Catalog Shape

Both catalogs currently contain the same 212 flattened keys. Top-level namespaces are:

| Namespace | Scope |
|-----------|-------|
| `Common` | Shared app labels, loading/error retry, theme/language labels. |
| `Navigation` | Sidebar and navigation labels. |
| `Auth` | Sign-in, sign-up, OAuth, and sign-out UI. |
| `Dashboard` | Dashboard page labels and cards. |
| `Study` | Study workspace, upload modal, quiz, results, and generated action states. |
| `Reading` | Reading view labels. |
| `Test` | Flashcard test labels. |
| `Progress` | Progress dashboard labels. |
| `Errors` | Error boundary and not-found copy. |

## Locale-Aware UI Boundaries

- App chrome: `src/ui/layout/dashboard-sidebar.tsx`, `language-switcher.tsx`, `user-menu.tsx`, `sign-out-button.tsx`.
- Auth screens: `src/app/[locale]/(auth)/sign-in/page.tsx`, `sign-up/page.tsx`, and `(auth)/layout.tsx`.
- Dashboard: `src/app/[locale]/page.tsx`.
- Study workspace: `src/features/study/*`.
- Error UI: `src/app/[locale]/(dashboard)/error.tsx`.

## Known Gaps

- Some dashboard and layout strings are still hard-coded in English, including helper copy, search placeholder, mobile brand text, and a few button titles.
- Some formatting is fixed to English, for example `Intl.DateTimeFormat("en")` and unlocalized plural helper text in `src/app/[locale]/page.tsx`.
- `src/proxy.ts` extracts locales with a hard-coded `/^(en|vi)/` regex. Add new locales in both `routing.ts` and this matcher if the matcher remains manual.
- Clerk auth redirects use `redirect_url`; verify this remains aligned with Clerk page props if auth pages are customized.

## References

- `src/i18n/routing.ts`
- `src/i18n/request.ts`
- `src/i18n/navigation.ts`
- `src/proxy.ts`
- `src/app/[locale]/layout.tsx`
- `localization/messages/en.json`
- `localization/messages/vi.json`
