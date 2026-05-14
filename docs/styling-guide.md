# Styling Guide

Source of truth for token values: `src/app/globals.css` `:root`.

## Color Tokens

Use ONLY these Tailwind classes (mapped from CSS variables):

| Tailwind Class | CSS Variable | Hex |
|----------------|-------------|-----|
| `bg-primary`, `text-primary` | `--primary` | `#3b5ce4` |
| `text-primary-foreground` | `--primary-foreground` | `#fff` |
| `bg-secondary`, `text-secondary` | `--secondary` | `#5a72f0` |
| `bg-accent`, `text-accent` | `--accent` | `#f0f3ff` |
| `bg-muted`, `text-muted` | `--muted` | `#e7eeff` |
| `text-muted-foreground` | `--muted-foreground` | `#454652` |
| `bg-destructive`, `text-destructive` | `--destructive` | `#ba1a1a` |
| `border-border` | `--border` | `#d8e3fb` |
| `text-foreground` | `--foreground` | `#111c2d` |
| `bg-background` | `--background` | `#f9f9ff` |

## FORBIDDEN Patterns

| Forbidden | Correct |
|-----------|---------|
| `bg-primary-600`, `text-primary-700` | `bg-primary`, `text-primary` |
| `bg-neutral-*`, `text-neutral-*` | `bg-muted`, `text-muted-foreground` |
| Hardcoded hex (`#185FA5`, `#378ADD`) | Theme token classes |
| `style={{ color: "#..." }}` for static colors | Tailwind classes |
| Raw `<button>` | shadcn `Button` |
| Raw `<input>` | shadcn `Input` |
| Raw `<textarea>` | shadcn `Textarea` |
| Inline SVGs (when Lucide has equivalent) | `import { Icon } from "lucide-react"` |
| `onMouseEnter`/`onMouseLeave` | Tailwind `hover:` classes |
| String concatenation for classes | `cn()` from `@/lib/shared/utils` |

## shadcn/ui Primitives

Components in `src/components/ui/`: avatar, badge, button, card, dialog, dropdown-menu, input, progress, separator, sheet, tabs, textarea, tooltip.

**Rules:**
- Import and compose — never modify files in `src/components/ui/`
- Use `Card`/`CardContent` for card-like layouts
- Use `Dialog` for modals
- Use `Button variant="outline"` or `variant="ghost"` for secondary actions
- Use `Badge` for status indicators

## Acceptable Exceptions

- Dynamic inline styles: `style={{ width: `${percentage}%` }}`
- Error boundary raw buttons (must work if shadcn fails — add comment)
- Hidden file inputs: `<input type="file" hidden>`

## Examples

```tsx
// BAD: hardcoded hex + raw button
<button style={{ color: "#185FA5", background: "#fff" }}>Submit</button>
// GOOD
<Button variant="outline">Submit</Button>
```

```tsx
// BAD: Tailwind v3 syntax
<div className="bg-primary-600 text-neutral-500">Card</div>
// GOOD
<div className="bg-primary text-muted-foreground">Card</div>
```

```tsx
// BAD: inline SVG
<svg width="16" height="16"><path d="..." /></svg>
// GOOD
import { Search } from "lucide-react"
<Search className="h-4 w-4" />
```

```tsx
// BAD: JS hover handler
<div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
// GOOD
<div className="hover:bg-accent">
```

- `cn(clsx(...), tailwindMerge(...))` for conditional styles
- No CSS modules or styled-components
- Dark mode: use Tailwind `dark:` variant

**Last Updated:** 2026-05-15
