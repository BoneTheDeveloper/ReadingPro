# Plan: Sidebar Simplification & Account Settings Page

**Status:** Draft | **Branch:** preview | **Updated:** 2026-07-24

## Brainstorm Contract

**Outcome:**
1. Simplify sidebar rail (remove unused elements)
2. Create `/account` page for account settings
3. Remove settings modal entirely

**Scope:**
- Logo becomes dashboard link (no separate Dashboard nav item)
- Remove theme toggle (light mode only)
- Remove settings button from rail
- User dropdown → links to `/account`
- Create full account settings page

**Non-goals:**
- Don't add dark mode back
- Don't add language settings (handled by i18n)

---

## Changes

### 1. Sidebar Rail Changes

**Before:**
```
[Logo] → decorative
[Dashboard] → GraduationCap → "/"
[Study] → BookOpen → "/study"
[Vocabulary] → Library → "/vocabulary"
[Dictionary] → BookMarked → "/dictionary"
[Theme] → Sun/Moon → toggle
[Settings] → SettingsIcon → open modal
[User Avatar] → dropdown
```

**After:**
```
[Logo] → GraduationCap → "/" (becomes dashboard link)
[Study] → BookOpen → "/study"
[Vocabulary] → Library → "/vocabulary"
[Dictionary] → BookMarked → "/dictionary"
[User Avatar] → dropdown (Settings, Logout)
```

### 2. User Dropdown Changes

**Before:** Settings, Logout
**After:** Settings → "/account", Logout

### 3. Remove Settings Modal

Delete `src/components/layout/settings-modal.tsx`

### 4. Create `/account` Page

Route: `src/app/[locale]/(app)/account/page.tsx`

Sections:
| Section | Fields |
|---------|--------|
| **Profile** | Name, Email (read-only), Avatar upload |
| **Security** | Change password (optional) |
| **Connected Accounts** | Google OAuth status |
| **Danger Zone** | Delete account |

---

## Files to Modify/Delete

| File | Action |
|------|--------|
| `src/components/layout/dashboard-sidebar.tsx` | Simplify rail, user dropdown |
| `src/components/layout/auth-controls.tsx` | Add Settings link |
| `src/components/layout/settings-modal.tsx` | **DELETE** |
| `src/app/[locale]/(app)/account/page.tsx` | **CREATE** |

---

## Implementation Steps

### Step 1: Update dashboard-sidebar.tsx
- [ ] Change logo to Link → href="/"
- [ ] Remove Dashboard nav item from navItems array
- [ ] Remove `RailThemeButton` component and usage
- [ ] Remove settings button from bottom section
- [ ] Remove `useTheme` import

### Step 2: Update auth-controls.tsx
- [ ] Add Settings link in dropdown menu
- [ ] Keep logout option

### Step 3: Delete settings-modal.tsx
- [ ] Delete file
- [ ] Remove from any imports

### Step 4: Create account page
- [ ] Create route `src/app/[locale]/(app)/account/page.tsx`
- [ ] Implement account settings form
- [ ] Use design system styling

### Step 5: Verify
- [ ] Run `pnpm typecheck`
- [ ] Run `pnpm lint`
- [ ] Test sidebar navigation
- [ ] Test account page

---

## Acceptance Criteria

- [ ] Logo navigates to dashboard
- [ ] No duplicate dashboard entry in nav
- [ ] No theme toggle visible
- [ ] No settings button in rail
- [ ] User dropdown has Settings → /account
- [ ] /account page shows account settings
- [ ] i18n still works via locale switcher
- [ ] No console errors
