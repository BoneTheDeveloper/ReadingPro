# Code Review: Phase 05 — Auth UI Components

**Date:** 2026-05-07
**Branch:** feature/supabase-auth
**Reviewer:** code-reviewer (subagent)
**Scope:** Auth UI: UserMenu, MobileSignOutButton, DropdownMenu primitive, dashboard-sidebar integration, middleware lint fix

---

## Files Reviewed

| File | Action | LOC |
|------|--------|-----|
| `src/components/user-menu.tsx` | Created | 78 |
| `src/components/mobile-sign-out-button.tsx` | Created | 25 |
| `src/components/ui/dropdown-menu.tsx` | Created | 85 |
| `src/components/dashboard-sidebar.tsx` | Modified | 259 |
| `src/lib/supabase/middleware.ts` | Modified | 29 |

**Also read for context:** `src/lib/supabase/client.ts`, `src/middleware.ts`, `src/app/(auth)/sign-in/page.tsx`, `src/app/auth/callback/route.ts`, `src/components/ui/button.tsx`

---

## Overall Assessment

Clean, minimal implementation. The shadcn-style DropdownMenu primitive is well-structured. Component decomposition (UserMenu + MobileSignOutButton) is reasonable. A few issues worth addressing before merge, none blocking-critical but one high-priority (error handling in sign-out).

---

## Critical Issues

None.

---

## High Priority

### H1. Unhandled sign-out errors — silent failure, user gets stuck

**Files:** `src/components/user-menu.tsx:39-43`, `src/components/mobile-sign-out-button.tsx:10-13`

Both `handleSignOut` functions call `supabase.auth.signOut()` with no error handling. If the call fails (network error, Supabase outage), the user sees no feedback. `router.push("/sign-in")` still fires, sending them to sign-in with a potentially still-valid session cookie. The middleware would redirect them back to the app on next navigation since the session wasn't actually cleared.

```tsx
// user-menu.tsx:39-43 — current
const handleSignOut = async () => {
  await supabase.auth.signOut()
  router.push("/sign-in")
  router.refresh()
}
```

**Recommendation:** Catch errors, show feedback. At minimum, don't navigate on failure:

```tsx
const handleSignOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    // Show toast or set error state — for now at least log
    console.error("Sign out failed:", error.message)
    return
  }
  router.push("/sign-in")
  router.refresh()
}
```

**Impact:** User gets redirect loop or confusing UX on sign-out failure.

### H2. `MobileSignOutButton` used in desktop sidebar — misleading name

**File:** `src/components/dashboard-sidebar.tsx:193`

`MobileSignOutButton` is placed in `SidebarContent` (the desktop icon sidebar, lines 133-196), not just in `MobileSidebarContent`. The component name implies mobile-only usage but it's used in both contexts. This will confuse future maintainers.

**Recommendation:** Rename to `SignOutButton` (drop the "Mobile" prefix) since it's a generic icon-only sign-out button used in both sidebars.

### H3. Duplicate sign-out logic — DRY violation

**Files:** `src/components/user-menu.tsx:39-43`, `src/components/mobile-sign-out-button.tsx:10-13`

Both components implement identical sign-out logic: `supabase.auth.signOut()` then `router.push("/sign-in")` then `router.refresh()`. If the redirect path changes or error handling is added (per H1), both files need updating.

**Recommendation:** Extract to a shared hook or utility:

```tsx
// src/hooks/use-sign-out.ts
export function useSignOut() {
  const router = useRouter()
  return async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Sign out failed:", error.message)
      return
    }
    router.push("/sign-in")
    router.refresh()
  }
}
```

---

## Medium Priority

### M1. `createClient()` called at module scope in UserMenu — new instance per render cycle boundary

**File:** `src/components/user-menu.tsx:19`

```tsx
const supabase = createClient()
```

This runs at the top of the component function body, creating a new Supabase client on every render. While `createBrowserClient` from `@supabase/ssr` is designed to be lightweight (it reuses cookies/sockets), it's still wasteful. The existing `sign-in/page.tsx` does the same thing so this is consistent with the codebase pattern, but `useMemo` or moving it inside the `useEffect` would be cleaner.

**Impact:** Low — `createBrowserClient` is cheap, but this sets a pattern that could be problematic if the function body grows.

### M2. `updateSession` in `src/lib/supabase/middleware.ts` is dead code

**File:** `src/lib/supabase/middleware.ts`

The `updateSession` function is exported but never imported anywhere. The actual middleware at `src/middleware.ts` has its own inline implementation. This file appears to be leftover from the Supabase scaffolding.

**Recommendation:** Delete `src/lib/supabase/middleware.ts` or consolidate with `src/middleware.ts`. Dead code adds confusion about which middleware implementation is canonical.

### M3. No loading state for UserMenu initial fetch

**File:** `src/components/user-menu.tsx:52`

The trigger shows "Loading..." as plain text when `userName` is null. This works but doesn't match the Material Design 3 skeleton/pulse pattern. The avatar shows "?" during loading, which looks like an error state rather than loading.

**Impact:** Minor UX — the "?" in the avatar circle reads as "unknown user" rather than "loading." Consider a subtle pulse animation or skeleton on the avatar during the fetch.

### M4. `user.user_metadata?.name` not sanitized before rendering

**File:** `src/components/user-menu.tsx:27-31`

User metadata comes from the OAuth provider and is stored in Supabase. While React escapes JSX by default (no XSS risk), if `user_metadata.name` contains very long strings or control characters, it could break layout. The `split("@")[0]` fallback is fine for email-derived names.

**Impact:** Very low — React's JSX escaping prevents XSS. Layout breakage from long names is the only real risk, and Tailwind's text overflow would handle most cases.

---

## Low Priority

### L1. DropdownMenu missing `DropdownMenuLabel` export

**File:** `src/components/ui/dropdown-menu.tsx`

The user info section in UserMenu (lines 63-66) is built with raw `<div>` + `<p>` elements. Standard shadcn DropdownMenu includes a `DropdownMenuLabel` primitive for this exact purpose, which adds proper `role="presentation"` and pointer event handling.

**Recommendation:** Add `DropdownMenuLabel` to the primitive for semantic completeness. Not blocking.

### L2. Inconsistent quote style in `dashboard-sidebar.tsx`

**File:** `src/components/dashboard-sidebar.tsx`

Uses double quotes (`"use client"`, `"use client"` with semicolons in some places) while `user-menu.tsx` and `mobile-sign-out-button.tsx` use double quotes without trailing semicolons. Minor inconsistency.

### L3. `DropdownMenuTrigger` missing `asChild` pattern consideration

**File:** `src/components/user-menu.tsx:49`

The trigger applies custom styling directly. This works fine now, but if the trigger ever needs to be a `<button>` for form submission or other native behavior, you'd need `asChild`. Not needed now — just noting for future.

---

## Security Assessment

| Check | Status |
|-------|--------|
| XSS via user metadata | Safe — React JSX escaping |
| Session tokens in client logs | Safe — Supabase SDK handles tokens internally |
| Sign-out clears client state | Safe — `signOut()` clears local session |
| Dropdown injection via user data | Safe — no `dangerouslySetInnerHTML` |
| Auth middleware guards all routes | Safe — `src/middleware.ts` redirects unauthenticated users |
| `next` param in sign-in redirect | Safe — used in OAuth flow, not in sign-out |

No security issues found.

---

## Accessibility Assessment

| Check | Status |
|-------|--------|
| Dropdown keyboard navigation | Good — Radix handles Arrow keys, Enter, Escape |
| Focus management | Good — Radix traps focus in open menu |
| ARIA attributes | Good — Radix adds `role="menu"`, `aria-expanded`, etc. |
| Screen reader support | Good — Radix announces menu open/close |
| MobileSignOutButton accessibility | Needs `aria-label` — the icon-only button has only a `title` attribute |
| Mobile menu close button | Good — has `aria-label="Open menu"` |

### L4. `MobileSignOutButton` missing visible label for screen readers

**File:** `src/components/mobile-sign-out-button.tsx:17-24`

The button only has a `title` attribute and a `LogOut` icon. `title` is not reliably read by screen readers. Should add `aria-label="Sign out"`.

---

## Positive Observations

- Clean shadcn-style DropdownMenu primitive — good Radix wrapping pattern with `data-slot` attributes
- Proper `"use client"` directives on all interactive components
- `useCallback` for `closeMobile` and `isActive` in dashboard-sidebar — good memoization
- `DropdownMenuContent` renders in a Portal — correct for z-index stacking
- Sign-in page has good UX: loading states, error display, disabled inputs during submission
- Auth callback route properly syncs user data via `syncUser`
- Middleware correctly handles public routes, authenticated redirect, and API routes
- Animation classes on dropdown use standard Tailwind CSS animate utilities

---

## Recommended Actions

1. **[H1]** Add error handling to both sign-out handlers — don't navigate on failure
2. **[H2]** Rename `MobileSignOutButton` to `SignOutButton` — it's used in both sidebars
3. **[H3]** Extract shared `useSignOut()` hook to DRY the logic
4. **[L4]** Add `aria-label="Sign out"` to the sign-out button
5. **[M2]** Delete or consolidate dead `src/lib/supabase/middleware.ts`

---

## Unresolved Questions

1. Is `src/lib/supabase/middleware.ts` intentionally kept as a reference/template, or is it safe to delete? The actual middleware lives in `src/middleware.ts`.
2. Should sign-out redirect to `/sign-in` or `/`? The middleware redirects authenticated users away from `/sign-in` back to `/study`, so going to `/sign-in` after sign-out is correct — but confirming the intent is worth a quick check.
3. Is there a design spec for the user avatar state (loading, error, authenticated)? Currently "Loading..." text + "?" avatar during fetch could look like an error to users.
