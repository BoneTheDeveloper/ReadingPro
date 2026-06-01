# Research Report: Next.js i18n Best Practices (App Router + next-intl)

**Date:** 2026-06-01
**Scope:** `<html lang>` attribute handling, root layout structure, next-intl App Router patterns

## Executive Summary

The official Next.js and next-intl recommended pattern for i18n in App Router places `<html>` and `<body>` inside the locale-specific layout (`app/[locale]/layout.tsx`), NOT in `app/layout.tsx`. This enables `lang={locale}` to reflect the actual locale from the URL param. The current project uses a two-layout pattern where `app/layout.tsx` owns `<html lang={routing.defaultLocale}>` — this always renders `lang="en"` regardless of the active locale, which is incorrect for accessibility and SEO.

## Key Findings

### 1. Official Next.js Pattern

Next.js official docs (`nextjs.org/docs/app/guides/internationalization`) recommend:

```tsx
// app/[lang]/layout.tsx
export default async function RootLayout({
  children,
  params,
}: LayoutProps<'/[lang]'>) {
  return (
    <html lang={(await params).lang}>
      <body>{children}</body>
    </html>
  );
}
```

Key points:
- No `app/layout.tsx` — the root layout lives directly in `app/[lang]/layout.tsx`
- `lang` attribute is dynamic, derived from the URL segment
- `generateStaticParams` pre-renders all locale variants at build time

### 2. next-intl Recommended Pattern

next-intl docs (`next-intl.dev/docs/getting-started/app-router`) follow the same approach:

```tsx
// app/[locale]/layout.tsx
export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

Key points:
- `<html lang={locale}>` — dynamic, matches URL
- `NextIntlClientProvider` wraps children inside `<body>`
- `setRequestLocale(locale)` enables static rendering
- `generateStaticParams` returns all supported locales
- No separate `app/layout.tsx` file exists

### 3. Why `lang={routing.defaultLocale}` Is Wrong

- Accessibility violation: screen readers use `lang` to pick pronunciation engine. A Vietnamese user on `/vi/about` with `lang="en"` gets mispronounced content.
- SEO impact: Google uses `lang` for hreflang and content language signals. Static `lang="en"` tells crawlers all pages are English.
- HTML spec compliance: the `lang` attribute should reflect the content language, not a default fallback.

### 4. Impact on Current Project

Current structure:
```
app/layout.tsx        — owns <html lang={routing.defaultLocale}>, <body>, ThemeProvider, SpeedInsights
app/[locale]/layout.tsx — owns NextIntlClientProvider only
```

Recommended structure:
```
app/[locale]/layout.tsx — owns <html lang={locale}>, <body>, ThemeProvider, SpeedInsights, NextIntlClientProvider
```

`app/layout.tsx` would be removed or reduced to a minimal pass-through (Next.js requires a root layout, but it can be empty when the `[locale]` layout is the effective root).

## Implementation Recommendation

Move `<html>`, `<body>`, fonts, `ThemeProvider`, and `SpeedInsights` from `app/layout.tsx` into `app/[locale]/layout.tsx`. The `lang` attribute becomes `lang={locale}` using the dynamic param.

`app/layout.tsx` becomes a minimal shell (Next.js requires it to exist):

```tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

## Resources

- [Next.js Internationalization Guide](https://nextjs.org/docs/app/guides/internationalization)
- [next-intl App Router Setup](https://next-intl.dev/docs/getting-started/app-router)
- [MDN: HTML lang attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/lang)

## Unresolved Questions

- Does the minimal `app/layout.tsx` pass-through work with Next.js 16 App Router? Need to verify — some Next.js versions require `<html>` and `<body>` in the root layout. If so, the root layout keeps the shell but uses a locale-aware `lang` via middleware or headers.
- Should `dir` attribute (RTL/LTR) also be set dynamically for future locale support?
