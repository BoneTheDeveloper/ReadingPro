# Auth Pages

## Routes

| Route | File | Component |
|-------|------|-----------|
| `/[locale]/sign-in` | `src/app/[locale]/(auth)/sign-in/[[...sign-in]]/page.tsx` | Clerk `SignIn` |
| `/[locale]/sign-up` | `src/app/[locale]/(auth)/sign-up/[[...sign-up]]/page.tsx` | Clerk `SignUp` |

## Purpose

Authentication pages provide sign-in and sign-up through Clerk while preserving locale-aware paths.

## Layout

Auth pages are wrapped by `src/app/[locale]/(auth)/layout.tsx`.

The auth shell is a centered, full-height layout:

- Background: app `background`.
- Container: `max-w-md`.
- Brand header: graduation-cap icon plus localized app name.
- Child content: Clerk hosted auth component.

## Routing Contract

- Sign-in path: `/${locale}/sign-in`
- Sign-up path: `/${locale}/sign-up`
- Sign-in links to localized sign-up.
- Sign-up links to localized sign-in.
- Both auth flows use localized fallback redirects to `/${locale}`.

## UI Rules

- Keep custom UI around Clerk minimal.
- Do not duplicate Clerk form controls.
- Preserve the centered auth shell and brand marker.
- Locale-aware URLs must stay explicit when configuring Clerk components.
