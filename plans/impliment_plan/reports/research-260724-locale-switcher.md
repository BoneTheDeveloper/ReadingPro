# Research Report: next-intl Locale Switcher

**Date:** 2026-07-24

## Findings

### 1. Correct Pattern for next-intl Locale Switching

From next-intl documentation and community best practices:

```typescript
// usePathname returns pathname WITHOUT locale prefix
// Use router.replace(pathname, { locale: newLocale })
const pathname = usePathname();
const router = useRouter();

router.replace(pathname, { locale: newLocale });
```

**Key points:**
- `usePathname()` from `@/i18n/navigation` returns the pathname **without** the locale prefix
- `router.replace(pathname, { locale: newLocale })` switches locale while keeping current path
- This is the official recommended approach from next-intl

### 2. Design System Alignment

From `docs/design.md`:

- **Corner radius:** Standard button = 14px, but icons can use radius 12px
- **Rail style:** 40px icons, radius 13px
- **No specific language switcher style defined** - using ghost button pattern

### 3. Implementation Changes Made

1. **Fixed routing logic:** Using `router.replace(pathname, { locale: newLocale })`
2. **Rail variant:** Globe icon with `rounded-[13px]` (matching rail design)
3. **Default variant:** Globe + label + chevron dropdown

### 4. Design Specs Applied

| Variant | Style |
|---------|-------|
| Rail | 40px square, radius 13px, white/60 → white on hover |
| Default | Ghost button, gap-1.5, label + chevron |

## Unresolved Questions

1. **Avatar image aspect ratio warning** - Fixed by removing conflicting CSS class dimensions
2. **Locale prefix behavior** - Routing config uses `localePrefix: "as-needed"` - verify default locale doesn't show prefix

## References

- [next-intl Navigation API](https://next-intl.dev/docs/routing/navigation)
- [Stack Overflow: Language Switcher](https://stackoverflow.com/questions/77618710/how-to-implement-language-switcher-using-next-intl)
- [GitHub Discussion #532](https://github.com/amannn/next-intl/discussions/532)
