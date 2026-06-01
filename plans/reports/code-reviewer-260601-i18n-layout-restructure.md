# Code Review: i18n Layout Restructure

**Date:** 2026-06-01
**Reviewer:** code-reviewer
**Scope:** `src/app/layout.tsx`, `src/app/[locale]/layout.tsx`
**LOC:** ~70 changed
**Focus:** Layout restructuring for dynamic `lang` attribute

## Scope

- Files: `src/app/layout.tsx`, `src/app/[locale]/layout.tsx`
- LOC: ~70 (removed from root, added to locale)
- Focus: Recent diff
- Scout findings: see below

## Overall Assessment

The restructuring correctly implements the next-intl + Next.js App Router i18n pattern. The `<html lang>` attribute is now dynamic per locale instead of hardcoded to `routing.defaultLocale`. Single `<html>/<body>` shell, no nesting. All 213 tests pass, typecheck clean, ESLint clean.

The change is sound and production-ready with one important follow-up and one low-priority observation.

## Critical Issues

None.

## Important Issues

### I1. `global-error.tsx` has hardcoded `lang="en"` -- locale mismatch on `/vi/*` routes

**File:** `src/app/global-error.tsx:18`

The error boundary page renders `<html lang="en">` with a static English string. When a Vietnamese user hits a global error, they see `lang="en"` and English-only text. This is a **pre-existing issue** not introduced by this diff, but it is now more visible because the locale layout correctly sets dynamic `lang` while the error boundary does not.

`global-error.tsx` replaces the root layout on error, so it MUST contain its own `<html>/<body>`. The `lang` attribute here cannot easily be dynamic since it runs outside the `[locale]` route segment. Options:

1. Accept the limitation -- global errors are edge cases, English is reasonable.
2. Read locale from URL pathname inside the component (`usePathname`).
3. Provide bilingual text ("Something went wrong / Da xay ra loi").

**Impact:** Low-severity accessibility and i18n consistency issue. Not a regression.
**Recommendation:** Document as known limitation or address in a follow-up.

### I2. `notFound()` return value unused -- TypeScript control flow gap

**File:** `src/app/[locale]/layout.tsx:39`

```typescript
if (!hasLocale(routing.locales, locale)) {
  notFound();  // throws, but TypeScript doesn't know this
}
```

`notFound()` throws a `NEXT_NOT_FOUND` error, so code after it never executes. However, TypeScript cannot verify this. If a future Next.js version changes `notFound()` to return instead of throw, the layout would render with an invalid locale.

**Recommendation:** Add `return` before `notFound()` or use `return notFound()` to make the control flow explicit:
```typescript
if (!hasLocale(routing.locales, locale)) {
  return notFound();
}
```

**Impact:** Defensive. Currently works correctly because `notFound()` throws.

## Observations

### O1. SpeedInsights moved outside ThemeProvider -- correct and cleaner

Previously `SpeedInsights` was inside `<ThemeProvider>`, now it is a sibling after `</ThemeProvider>` but still inside `<body>`. This is a non-functional change since SpeedInsights is a script-injecting component that does not depend on theme context. The new placement is cleaner -- provider wraps only the app content.

### O2. Font configuration preserved correctly

`Inter`, `Literata`, and `JetBrains_Mono` all include `subsets: ["latin", "vietnamese"]` (where applicable), which is correct for the supported locales. Font CSS variables are applied to `<html>` className as before.

### O3. `globals.css` imported exactly once

The import moved from `src/app/layout.tsx` to `src/app/[locale]/layout.tsx` with the correct relative path (`"../globals.css"`). No duplicate imports found anywhere in the codebase.

### O4. `generateStaticParams` and `setRequestLocale` preserved

Both are present in the locale layout, ensuring static rendering continues to work for "en" and "vi" locales.

### O5. No `dir` attribute on `<html>` -- acceptable for current locales

Neither "en" nor "vi" are RTL locales. If RTL locales are added in the future, a `dir` attribute should be added to the `<html>` element.

### O6. No `metadata` export -- consistent with previous state

Neither the old root layout nor the new locale layout exports `metadata` or `generateMetadata`. This was the case before and is not a regression. Consider adding locale-aware metadata in a follow-up.

## Edge Cases Found by Scout

1. **`global-error.tsx` hardcoded lang** -- see I1 above.
2. **No `not-found.tsx` at any level** -- there is no `not-found.tsx` in `src/app/` or `src/app/[locale]/`. The `notFound()` call in the locale layout will render Next.js default 404 page. This is fine but means no localized 404 page exists.
3. **`setRequestLocale` called in both locale layout and auth layout** -- the auth layout at `src/app/[locale]/(auth)/layout.tsx` also calls `setRequestLocale(locale)`. This is harmless (idempotent) and follows the next-intl recommendation for nested layouts.

## Positive Observations

1. Clean separation: root layout is a pure pass-through, locale layout owns the HTML shell.
2. `suppressHydrationWarning` correctly placed on `<html>` -- required by ThemeProvider's inline script injection.
3. `hasLocale()` validation happens before any rendering -- prevents invalid locale from reaching the page.
4. No nested `<html>/<body>` elements -- verified across entire `src/app/` tree.
5. `NextIntlClientProvider` correctly wraps `{children}` inside `<body>`.
6. All 213 tests pass, typecheck clean, ESLint clean.

## Recommended Actions

1. **(Important)** Add `return` before `notFound()` call in locale layout for explicit control flow. One-line change.
2. **(Follow-up)** Consider adding `not-found.tsx` at `src/app/[locale]/` level for a localized 404 experience.
3. **(Follow-up)** Consider making `global-error.tsx` locale-aware or at minimum bilingual.
4. **(Follow-up)** Add `metadata` export to locale layout for SEO (`title`, `description` per locale).

## Metrics

- Type Coverage: 100% (typecheck passes)
- Test Coverage: 213/213 tests pass
- Linting Issues: 0

## Unresolved Questions

- None. The restructuring is sound and aligns with the official next-intl App Router pattern.
