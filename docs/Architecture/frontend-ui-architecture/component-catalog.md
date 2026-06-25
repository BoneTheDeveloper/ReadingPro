# Component Catalog

**Lens:** the reusable UI building blocks — *what* components exist, their variants, states,
and when to reach for each. This is the component-level companion to the page/screen docs in
this folder, which describe *how pages are composed*.

> **Scope split.** This catalog owns the **component inventory** (anatomy, variants, props,
> states, usage). It does **not** own visual tokens — color, typography, spacing, radius,
> component's look is described here, it links to the token, never restates it.

## Where components live

| Layer | Path | Role |
|-------|------|------|
| Primitives | `src/ui/primitives` | Framework-agnostic UI atoms (shadcn-style, built on Base UI). Use these first. |
| Layout | `src/ui/layout` | App-shell chrome shared across dashboard routes. |
| Feature UI | `src/features/<feature>/ui` | Product components specific to one feature. See the per-page docs. |

## Conventions

All primitives follow the same shape, so a new one is predictable:

- **Base UI foundation.** Most primitives wrap `@base-ui/react/*` for behavior and a11y;
  styling is applied on top with Tailwind.
- **`data-slot` attribute.** Every primitive (and sub-part) sets `data-slot="<name>"` for
  styling hooks and test/query targeting.
- **`cva` variants.** Components with visual variants use `class-variance-authority`; the
  variant map is exported (e.g. `buttonVariants`) for composition.
- **`cn` merge.** Class lists merge through `cn` from `@/ui/utils`; callers can always
  pass `className` to extend.
- **Native prop pass-through.** Props extend the underlying element/primitive props, so
  standard HTML/ARIA attributes work without wrappers.

## Primitive inventory

| Component | Exports | Variants / sizes | Notable states |
|-----------|---------|------------------|----------------|
| Button | `Button`, `buttonVariants` | variant: default, outline, secondary, ghost, destructive, link · size: default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg | hover, focus-visible ring, active press (`translate-y-px`), disabled, `aria-invalid`, `aria-expanded` |
| Badge | `Badge`, `badgeVariants` | variant: default, secondary, destructive, outline, ghost, link | focus-visible ring, `aria-invalid`; renders as `span` or via `render` prop |
| Card | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` | size: default, sm | footer auto-styles when present; image first/last child rounds corners |
| Input | `Input` | — | focus-visible ring, disabled, `aria-invalid`, dark surface |
| Textarea | `Textarea` | — | auto-grow (`field-sizing-content`), focus ring, disabled, `aria-invalid` |
| Progress | `Progress`, `ProgressTrack`, `ProgressIndicator`, `ProgressLabel`, `ProgressValue` | — | driven by `value`; indicator animates width |
| Tabs | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `tabsListVariants` | list variant: default, line · orientation: horizontal, vertical | active trigger highlight |
| Dialog | `Dialog`, `DialogTrigger`, `DialogPortal`, `DialogClose`, `DialogOverlay`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription` | — | open/closed, overlay, focus trap (Base UI) |
| Sheet | `Sheet`, `SheetTrigger`, `SheetClose`, `SheetPortal`, `SheetOverlay`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription` | side (edge drawer) | open/closed slide; used for mobile drawer |
| Tooltip | `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` | — | hover/focus open delay (Base UI) |
| Dropdown menu | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator` | — | open/closed, item highlight, keyboard nav |
| Avatar | `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarBadge`, `AvatarGroup`, `AvatarGroupCount` | — | image load fallback; group overflow count |
| Scroll area | `ScrollArea` | — | custom scrollbar surface |
| Separator | `Separator` | orientation: horizontal, vertical | decorative divider |

## Component anatomy (key primitives)

The high-traffic primitives, documented at the anatomy/usage level. Style tokens come from
[Design](../../Design/design.md); this section covers structure and when to use what.

### Button

- **Anatomy:** single element; optional leading/trailing icon via `data-icon=inline-start|inline-end`; auto-sizes SVG children.
- **Variants:** `default` (primary action), `outline` / `secondary` (lower emphasis), `ghost` (toolbar/icon actions), `destructive` (delete/remove), `link` (inline navigation).
- **Sizes:** text sizes `xs|sm|default|lg`; square `icon*` sizes for icon-only controls (always pair with a `title`/aria-label).
- **States:** hover, focus-visible ring, active press, disabled (pointer-events off, 50% opacity), invalid (`aria-invalid`), expanded (`aria-expanded` for menu/popover triggers).
- **Use when:** any click action. Prefer `ghost` + `icon` for dense toolbars (Study panels), `default` for the one primary action per region, `destructive` only behind intent (e.g. delete in a row menu).

### Card

- **Anatomy:** `Card` shell with optional `CardHeader` (+ `CardTitle`, `CardDescription`, `CardAction`), `CardContent`, and `CardFooter`. Footer auto-gains a top border + muted background.
- **Sizes:** `default` and `sm` (tighter gaps/padding) via `size` prop, propagated to sub-parts.
- **Use when:** framed tools and grouped content (dashboard stat cards, studio action cards, source rows). **Avoid** nesting cards inside the reader — see the Study visual contract.

### Tabs

- **Anatomy:** `Tabs` root → `TabsList` (`TabsTrigger`×n) + `TabsContent`×n.
- **Variants:** list `default` (filled pill track) or `line` (underline); orientation horizontal/vertical.
- **Use when:** switching peer views within one surface (Vocabulary words vs sets).

### Dialog vs Sheet

- **Dialog:** centered modal with overlay + focus trap. Use for focused workflows (Study upload modal).
- **Sheet:** edge-anchored drawer. Use for navigation/secondary panels on small screens (mobile sidebar drawer).
- **Rule:** modal flows use `*Modal` naming and `Dialog`; slide-in panels use `Sheet`.

### Progress

- **Anatomy:** `Progress` root composes `ProgressTrack` → `ProgressIndicator`; optional `ProgressLabel` and `ProgressValue` (right-aligned, tabular numerals).
- **Use when:** determinate progress (reading progress bar, upload analysis, study stats).

## Layout components

App-shell chrome under `src/ui/layout`, mounted by the dashboard layout:

| Component | File | Role |
|-----------|------|------|
| `DashboardSidebar` | `dashboard-sidebar.tsx` | Desktop icon rail + mobile drawer, top bar, search, destinations. |
| `AuthControls` | `auth-controls.tsx` | Clerk user/auth controls in the top bar. |
| `LanguageSwitcher` | `language-switcher.tsx` | next-intl locale switcher. |
| `ThemeToggle` | `theme-toggle.tsx` | Light/dark toggle. |


## Feature components

Product components live under `src/features/<feature>/ui` and are documented with their
screens, not here (single source of truth):

| Feature | UI doc |
|---------|--------|
| Study workspace (sources, reader, studio, chat, translate, quiz) | [study-page.md](pages/study-page.md) |
| Dictionary | [dictionary-page.md](pages/dictionary-page.md) |
| Vocabulary | [vocabulary-page.md](pages/vocabulary-page.md) |
| Dashboard home | [dashboard-page.md](pages/dashboard-page.md) |
| Upload / processing | [upload-page.md](pages/upload-page.md), [processing-page.md](pages/processing-page.md) |
| Auth | [auth-pages.md](pages/auth-pages.md) |

## Adding a new component

1. Reusable across features → `src/ui/primitives`. Feature-only → that feature's `ui/`.
2. Wrap the Base UI primitive when one exists; add `data-slot`.
3. Add visual variants with `cva` and export the variant map.
4. Pull colors/spacing/radius from [Design tokens](../../Design/design.md) — do not hardcode new values.
5. Allow `className` pass-through via `cn`.
6. Add a row to the inventory above; document anatomy if it is a high-traffic primitive.
