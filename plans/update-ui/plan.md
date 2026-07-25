---
phase: 1
title: "Login-in UI Implementation"
status: pending
priority: P1
effort: "4h"
---

# Login-in UI Implementation Plan

## Overview
Implement Linear-style login and signup pages with pill buttons, OAuth providers (Google, Apple), step-by-step flows, and duplicate account handling.

## Requirements
- **Login page**: Google → Email → Apple (order)
- **Signup page**: Method → Email → Code → Password (4 steps)
- **Signup validation**: Email format + password strength
- **Login**: No validation (just pass to backend)
- **Design system**: Paper background, indigo primary, pill buttons
- **Persistence**: Remember last login method

## Wireframes
See `wireframe/login.html` and `wireframe/signup.html`

## Architecture

### Login Flow
```
┌─────────────────────────────────────────────┐
│  Login Methods                               │
│  ├─ Google (indigo) ───────────────────────┤
│  ├─ hoặc divider                           │
│  ├─ Email (gray) ───┐                     │
│  └─ Apple (gray) ────┼──▶ Email+Password  │
└───────────────────────┼─────────────────────┘
```

### Signup Flow
```
┌─────────────────────────────────────────────┐
│  Step 1: Choose Method                       │
│  ├─ Google (indigo) ───────────────────────┤
│  ├─ hoặc divider                           │
│  ├─ Email (gray) ───┐                     │
│  └─ Apple (gray) ────┼──▶ Step 2: Email   │
└───────────────────────┼─────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────┐
│  Step 2: Email                               │
│  ├─ Email input                              │
│  └─ Continue → validation                   │
└─────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────┐
│  Step 3: Code Verification                   │
│  ├─ 6-digit code input                       │
│  └─ Gửi lại link                            │
└─────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────┐
│  Step 4: Password (Signup only)              │
│  ├─ Password + toggle                        │
│  ├─ Confirm password + toggle                │
│  └─ Password strength indicator               │
└─────────────────────────────────────────────┘
```

## Duplicate Account Handling

### All scenarios: Auto-link silently (no modal)

**Same logic applies for all cases:**
- Email signup → exists via OAuth → Auto-link OAuth to existing account
- OAuth signup → exists via another OAuth → Auto-link new OAuth to existing account
- OAuth signup → exists via email/password → Auto-link OAuth to existing account

```
User signs up with method A → Same email exists via method B
→ Backend auto-links method A to existing account
→ Return token → User enters app
```

**Why no modal?**
- OAuth providers (Google, Apple) verify email → safe to auto-link
- No friction for user
- User can always login with any linked method

## Related Code Files

| Action | Path | Notes |
|--------|------|-------|
| Create | `src/auth/components/pill-button.tsx` | Reusable pill button (primary/secondary) |
| Create | `src/auth/components/pill-input.tsx` | Pill input with optional toggle |
| Create | `src/auth/components/password-input.tsx` | Password input with strength indicator |
| Create | `src/auth/components/code-input.tsx` | 6-digit verification code input |
| Create | `src/auth/components/login-in-form.tsx` | Combined login/signup form |
| Create | `src/auth/components/login-in-method.tsx` | Method selection buttons |
| Create | `src/auth/hooks/use-last-login.ts` | Persist last login method |
| Create | `src/auth/hooks/use-auth-signup.ts` | Signup with validation |
| Modify | `src/auth/page.tsx` | Add login-in route |

## Implementation Steps

### Phase 1: Base Components
1. Create `pill-button.tsx` - variants: primary (indigo), secondary (gray)
2. Create `pill-input.tsx` - basic text input with pill styling
3. Create `password-input.tsx` - with show/hide toggle + strength indicator
4. Create `code-input.tsx` - 6-digit code with auto-focus

### Phase 2: Login-in Page Structure
5. Create `login-in-method.tsx` - Google → Email → Apple buttons with divider
6. Create `login-in-form.tsx` - Main container with step management
7. Implement method selection → form toggle

### Phase 3: Login Flow (No validation)
8. Email + Password fields (no validation, just styling)
9. Connect to backend login endpoint
10. Save last login method to localStorage with namespace

### Phase 4: Signup Flow (With validation)
11. Step 2: Email input with format validation
12. Step 3: Code verification (6-digit)
13. Step 4: Password creation with strength + confirmation match
14. Connect to backend signup endpoints

### Phase 5: Auto-linking (Backend)
15. Backend auto-links accounts with same verified email
16. Frontend receives token → redirect to app

### Phase 6: Polish
19. Transitions between steps
20. Loading states for buttons
21. Error messages
22. Responsive testing

## LocalStorage Utility
```typescript
// src/lib/storage.ts
const PREFIX = 'reading_app_v1_';

export const storage = {
  set: (key, value) => {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
  },
  get: (key) => {
    const data = localStorage.getItem(`${PREFIX}${key}`);
    return data ? JSON.parse(data) : null;
  },
  remove: (key) => {
    localStorage.removeItem(`${PREFIX}${key}`);
  },
  clearAppOnly: () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
};

// Usage
storage.set('lastLoginMethod', 'google');
storage.get('lastLoginMethod');
```

## Success Criteria
- [ ] Google → hoặc → Email → Apple button order
- [ ] Login: Email+Password with no client validation
- [ ] Signup: Email format validation, password strength, password match
- [ ] Duplicate email detection shows appropriate modal
- [ ] Last login method remembered, label shown on return
- [ ] All buttons pill-shaped with indigo shadow
- [ ] Password inputs have show/hide toggle
- [ ] Follows design system colors

## Open Questions
- [x] Add Apple OAuth? → Yes, add to both pages
- [x] Validation for login? → No, pass to backend
- [x] Validation for signup? → Yes, email format + password strength/match
- [x] Component naming? → login-in-form (combined)
- [x] Duplicate handling? → Defined scenarios A-D above
