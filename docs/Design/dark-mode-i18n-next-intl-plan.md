# Dark Mode and English/Vietnamese Locale Switch Plan

Status: Draft  
Last Updated: 2026-05-20  
Related plan: `plans/260520-darkmode-next-intl/plan.md`

## Goal

Add dark mode and English/Vietnamese language switching with `next-intl`, while preserving the app's calm, editorial, reading-first design.

## Current State

- Next.js 16 App Router with `src/proxy.ts`.
- Tailwind CSS 4 with shadcn-compatible CSS variables in `src/app/globals.css`.
- Fonts already support Vietnamese through Inter and Literata subsets.
- Supabase auth protection is handled in `src/proxy.ts`.
- UI copy is currently hardcoded in route and feature components.
- `next-intl` and `next-themes` are not installed.

## External References

- `next-intl` locale routing uses a top-level `[locale]` segment, routing config, request config, and proxy/middleware setup: https://next-intl.dev/docs/routing/setup
- `next-intl` provides locale-aware navigation wrappers via `createNavigation`: https://next-intl.dev/docs/routing/navigation
- shadcn/ui recommends `next-themes`, `attribute="class"`, `defaultTheme="system"`, and `suppressHydrationWarning` for Next.js dark mode: https://ui.shadcn.com/docs/dark-mode/next

## Scope

In scope:

- Light/dark/system theme mode.
- English and Vietnamese UI locales.
- Locale-prefixed user-facing routes: `/en/*`, `/vi/*`.
- Locale switcher that preserves the current page where possible.
- Dark-mode token file: `docs/Design/darkmode-color-design.md`.
- Message files for UI copy.

Out of scope:

- Translating user-uploaded passages or AI-generated learning content.
- Database-stored theme/language settings.
- Localized URL slugs.
- RTL support.
- CMS or translation-management integration.

## Architecture

### Theme

Use `next-themes` as the state layer and CSS variables as the visual layer.

Planned files:

- `src/components/theme-provider.tsx`
- `src/components/layout/theme-toggle.tsx`
- `src/app/globals.css`
- `docs/Design/darkmode-color-design.md`

Root layout changes:

- Add `suppressHydrationWarning` to `<html>`.
- Wrap body children with `ThemeProvider`.
- Use `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`.

### Internationalization

Use `next-intl` with locale-based routing.

Planned files:

- `src/i18n/routing.ts`
- `src/i18n/navigation.ts`
- `src/i18n/request.ts`
- `messages/en.json`
- `messages/vi.json`

Routing config:

```ts
export const routing = defineRouting({
  locales: ["en", "vi"],
  defaultLocale: "en",
});
```

Route structure target:

```txt
src/app/
  layout.tsx
  global-error.tsx
  api/
  auth/callback/route.ts
  [locale]/
    layout.tsx
    page.tsx
    (auth)/
    (dashboard)/
```

### Proxy Composition

The existing `src/proxy.ts` should not be replaced without preserving auth behavior.

Target behavior:

- `next-intl` handles locale negotiation and route prefixes for user-facing routes.
- Supabase auth still refreshes/sets cookies.
- `/api/*`, `/_next/*`, static assets, `/monitoring`, and `/auth/callback` stay safe.
- Unauthenticated protected routes redirect to `/{locale}/sign-in?next=...`.
- Logged-in users visiting localized sign-in/sign-up redirect to `/{locale}`.

## Implementation Phases

### Phase 1: Dark Token Design

1. Add `docs/Design/darkmode-color-design.md`.
2. Add `.dark` overrides in `src/app/globals.css`.
3. Replace hardcoded scrollbar colors with variable-aware values.
4. Update `docs/Design/styling-guide.md` after implementation.

Acceptance:

- Light mode stays visually stable.
- Dark mode has readable surfaces, borders, inputs, popovers, and reading panels.

### Phase 2: next-intl Routing

1. Install `next-intl`.
2. Wrap `next.config.ts` with the next-intl plugin.
3. Add `src/i18n/*` modules.
4. Move user-facing routes into `src/app/[locale]/`.
5. Add `NextIntlClientProvider` in `[locale]/layout.tsx`.
6. Compose `next-intl` proxy behavior with current Supabase auth logic.

Acceptance:

- `/en`, `/vi`, `/en/study`, `/vi/study`, `/en/sign-in`, `/vi/sign-in` work.
- API routes do not require locale prefixes.
- Auth redirects still work.

### Phase 3: Theme and Locale Controls

1. Install `next-themes`.
2. Add `ThemeProvider`.
3. Add `ThemeToggle` to dashboard top bar and mobile menu.
4. Add `LanguageSwitcher` using locale-aware navigation.
5. Add accessible labels and keyboard support.

Acceptance:

- Theme persists after reload.
- Locale switch preserves current route.
- Controls do not overflow on mobile.

### Phase 4: Copy Migration

1. Create English message namespaces from current hardcoded copy.
2. Add Vietnamese translations.
3. Convert layout/navigation/auth first.
4. Convert dashboard/study/upload/reading/test/progress second.
5. Keep uploaded passages and generated questions as learning content, not UI copy.

Suggested namespaces:

- `Common`
- `Navigation`
- `Auth`
- `Dashboard`
- `Study`
- `Upload`
- `Reading`
- `Test`
- `Progress`
- `Errors`

Acceptance:

- Main UI renders in both languages.
- Vietnamese text fits buttons, cards, and mobile navigation.

### Phase 5: Validation

Commands:

```bash
pnpm tsc --noEmit
pnpm lint
pnpm build
```

Manual checks:

- Light and dark dashboard.
- Light and dark study workspace.
- English and Vietnamese auth pages.
- Locale switch on dynamic routes like reading/test pages.
- Logged-out protected route redirect.
- Sign-out flow.
- Mobile width checks for Vietnamese labels.

## Risks

- Route migration can break App Router imports and protected paths.
- Proxy changes can break Supabase cookie writes.
- Vietnamese copy can overflow compact controls.
- Dark mode can expose light-only hardcoded classes.

## Mitigations

- Migrate route groups in small batches.
- Keep proxy auth tests in the same phase as next-intl routing.
- Use semantic Tailwind tokens only.
- Add screenshot checks before final review.
