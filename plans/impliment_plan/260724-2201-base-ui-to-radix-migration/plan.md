# Plan: Migrate from base-ui to Radix UI

**Status:** Draft | **Branch:** preview | **Updated:** 2026-07-24

## Context

User wants to simplify the UI layer by replacing `@base-ui/react` with `@radix-ui/react-*` packages. Base-UI is more opinionated; Radix provides simpler primitives with less magic.

## Brainstorm Contract

**Outcome:** All `@base-ui/react` components replaced with `@radix-ui/react-*` equivalents, maintaining the same visual design.

**Constraints:**
- Keep design tokens (colors, shadows, spacing) unchanged
- Maintain same visual appearance
- Don't touch business logic

**Non-goals:**
- Don't redesign UI — just swap primitives
- Don't change design tokens

**Acceptance criteria:**
- [ ] All components render correctly
- [ ] No console errors
- [ ] Same visual appearance as before
- [ ] All interactions work (dialogs, dropdowns, tabs, etc.)

---

## Component Mapping

| Current | Target Package | Changes Needed |
|---------|---------------|----------------|
| `button.tsx` | `@radix-ui/react-slot` | Use Slot for polymorphic, simplify CVA |
| `dialog.tsx` | `@radix-ui/react-dialog` | Similar API, adjust class names |
| `tabs.tsx` | `@radix-ui/react-tabs` | Adjust root/trigger/content pattern |
| `sheet.tsx` | `@radix-ui/react-dialog` | Can reuse dialog with side positioning |
| `input.tsx` | (keep custom) | Already custom, no change |
| `tooltip.tsx` | `@radix-ui/react-tooltip` | Adjust positioning props |
| `dropdown-menu.tsx` | `@radix-ui/react-dropdown-menu` | **Already radix — no change** |
| `label.tsx` | `@radix-ui/react-label` | Simple wrapper |
| `progress.tsx` | `@radix-ui/react-progress` | Adjust to radix progress |

---

## Files to Modify

```
src/components/ui/
├── button.tsx      # @radix-ui/react-slot + CVA
├── dialog.tsx      # @radix-ui/react-dialog
├── tabs.tsx        # @radix-ui/react-tabs
├── sheet.tsx       # @radix-ui/react-dialog (with side prop)
├── tooltip.tsx     # @radix-ui/react-tooltip
└── label.tsx       # @radix-ui/react-label

package.json        # Remove @base-ui, add @radix-ui/react-*
```

---

## Implementation Steps

### Step 1: Update dependencies
- [ ] Remove `@base-ui/react`
- [ ] Add required `@radix-ui/react-*` packages:
  - `@radix-ui/react-dialog`
  - `@radix-ui/react-tabs`
  - `@radix-ui/react-tooltip`
  - `@radix-ui/react-label`
  - `@radix-ui/react-progress`
  - `@radix-ui/react-slot`

### Step 2: Migrate button.tsx
- [ ] Import Slot from `@radix-ui/react-slot`
- [ ] Remove base-ui ButtonPrimitive wrapper
- [ ] Keep CVA variant system (it works fine with radix)
- [ ] Simplify to use Slot for polymorphic `asChild`

### Step 3: Migrate dialog.tsx
- [ ] Replace Dialog from `@base-ui/react/dialog` with `@radix-ui/react-dialog`
- [ ] Adjust prop names (Popup → DialogContent, Backdrop → Overlay)
- [ ] Update animation classes if needed
- [ ] Keep same visual styling

### Step 4: Migrate tabs.tsx
- [ ] Replace from `@base-ui/react/tabs` to `@radix-ui/react-tabs`
- [ ] Adjust Root/Trigger/Content pattern
- [ ] Keep styling

### Step 5: Migrate sheet.tsx
- [ ] Use `@radix-ui/react-dialog` with `side` prop
- [ ] Sheet is essentially a dialog with positioning

### Step 6: Migrate tooltip.tsx
- [ ] Replace with `@radix-ui/react-tooltip`
- [ ] Adjust positioning (Provider, Portal, Content)

### Step 7: Migrate label.tsx
- [ ] Use `@radix-ui/react-label`

### Step 8: Migrate progress.tsx
- [ ] Use `@radix-ui/react-progress`

### Step 9: Cleanup
- [ ] Run `pnpm install`
- [ ] Run `pnpm typecheck`
- [ ] Run `pnpm lint`
- [ ] Verify all components visually

---

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Animation classes differ | Keep existing classes, adjust if needed |
| Type mismatches | Radix types are similar, should migrate cleanly |
| Missing features | Radix covers all base-ui features |

---

## Non-Goals

- Don't change design tokens
- Don't redesign components
- Don't touch business logic
