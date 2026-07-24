# Plan: Sign-up Page Implementation

**Status:** Plan + Wireframe Complete | **Branch:** preview | **Updated:** 2026-07-24

## Context

User wants to update the signup page to match the design system in `docs/Design/design.md`. The current wireframe uses Tailwind with a purple gradient theme that doesn't match our warm paper-based design system.

**References:**
- Design system: `docs/Design/design.md`
- Existing auth components: `src/components/auth/sign-up-form.tsx`
- Auth pages: `src/app/[locale]/(auth)/sign-up/`
- Wireframe: `plans/update-ui/wireframe/`

---

## Design System Requirements

From `docs/Design/design.md`:

### Colors (warm paper base)
| Role | Hex | Usage |
|------|-----|-------|
| Paper / App bg | `#F5F2EC` | Global background |
| Surface / Reader | `#FFFFFF` | Cards, inputs |
| Border | `#EAE5DB` | Dividers, inputs |
| Dark anchor (rail) | `#221F2B` | Primary text |
| **Indigo** (brand) | `#5A4FE0` | Primary actions |
| **Coral** (accent) | `#F2664A` | Secondary CTA |

### Typography
- **UI Font:** Plus Jakarta Sans (400/500/600/700)
- **Section labels:** 11px, 700, letter-spacing 0.13em, UPPERCASE, color `#908B98`

### Components
- **Buttons:** radius 14px, padding `11px 20px`, 14px/600, transition 140ms
- **Inputs:** border-radius 11px, padding `9px 12px`, focus indigo border + glow
- **Cards:** white surface, border `#EAE5DB`, radius 16px

### Icons
- Use Lucide inline SVG (NOT emoji)
- Standard: 24x24, stroke-width 2, stroke-linecap/linejoin round

---

## Implementation Approach

### Phase 1: Update Wireframe (sign-up.html)

Create a new signup wireframe that follows the design system:

```
Layout:
- Full-page centered card on paper background (#F5F2EC)
- Card: white surface, border #EAE5DB, radius 16px, max-width 420px
- Header: Logo icon (graduation-cap from Lucide) + title
- Form: Name, Email, Password fields with proper labels
- Social auth: Google OAuth button
- Footer: Link to sign-in
```

### Phase 2: Update `sign-up-form.tsx`

Refactor existing component to match design system:

**Visual updates:**
- Replace Card with custom styled container using design tokens
- Update input styling with paper theme colors
- Update button variants (primary=indigo, outline for social)
- Add proper focus states with indigo glow
- Add password toggle with Lucide Eye/EyeOff icons

**UX improvements:**
- Inline validation on blur
- Error messages below each field
- Loading state with spinner
- Password strength indicator
- Terms checkbox

**Accessibility:**
- Proper labels for all inputs
- aria-invalid states
- Focus management
- Keyboard navigation

### Phase 3: Update Page (`sign-up/page.tsx`)

Update the page wrapper:
- Paper background
- Centered card layout
- Link to sign-in at bottom
- Proper locale routing

---

## Files to Modify

| File | Changes |
|------|---------|
| `plans/update-ui/wireframe/sign-up.html` | NEW - wireframe following design.md |
| `src/components/auth/sign-up-form.tsx` | Refactor to match design system |
| `src/app/[locale]/(auth)/sign-up/[[...sign-up]]/page.tsx` | Update wrapper styling |

---

## Implementation Steps

### Step 1: Create wireframe (`sign-up.html`)
- [x] Paper background (#F5F2EC)
- [x] Centered white card with border
- [x] Logo + "Create account" header
- [x] Form fields: name, email, password (with toggle)
- [x] Primary button (indigo)
- [x] Google OAuth button (outline)
- [x] Sign-in link

### Step 2: Refactor `sign-up-form.tsx`
- [ ] Import design tokens / use CSS variables
- [ ] Update form container styling
- [ ] Add Lucide icons (User, Mail, Lock, Eye, EyeOff)
- [ ] Add password visibility toggle
- [ ] Update validation logic (inline on blur)
- [ ] Add loading spinner
- [ ] Update error handling

### Step 3: Update page wrapper
- [ ] Add paper background
- [ ] Center card vertically and horizontally
- [ ] Update sign-in link styling

---

## Acceptance Criteria

- [ ] Sign-up page matches warm paper design system
- [ ] All form fields have proper labels and validation
- [ ] Password toggle works correctly
- [ ] Primary button uses indigo (#5A4FE0) with tinted shadow
- [ ] Google OAuth button uses outline style
- [ ] Loading states display spinner
- [ ] Error messages appear below relevant fields
- [ ] Mobile responsive (works on 375px+)
- [ ] Accessible (keyboard nav, screen reader support)
- [ ] No emojis as icons (use Lucide SVG)
- [ ] Wireframe created following design.md

---

## Non-Goals

- OAuth implementation (already exists)
- Email verification flow
- Password reset
- Social auth beyond Google
- Multi-step registration

---

## Decisions (User Confirmed)

- **Password strength indicator:** No (minimal approach)
- **Terms checkbox:** No (minimal approach)
- **Scope:** Update plan only, implementation deferred

## Questions / Blockers

None remaining — scope is clear.
