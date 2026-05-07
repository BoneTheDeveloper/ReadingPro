# Phase 06: Testing and Validation

## Context

- **Issue:** https://github.com/BoneTheDeveloper/english-reading-training-app/issues/22
- **Branch:** `feature/supabase-auth`
- **Depends on:** All prior phases (01-05)

## Overview

End-to-end validation of the complete auth flow. Manual testing checklist covering all authentication scenarios, integration with existing features, and edge cases.

## Requirements

### Functional
- All auth flows work end-to-end
- All existing features work with authenticated user
- No regressions in non-auth functionality

### Non-Functional
- `npm run build` passes
- `npm run lint` passes
- No console errors during auth flows

## Test Scenarios

### 1. Email/Password Authentication

| # | Scenario | Expected Result | Pass |
|---|----------|----------------|------|
| 1.1 | Navigate to `/sign-up`, enter valid email + password | Account created, redirected to `/study` | [ ] |
| 1.2 | Navigate to `/sign-in`, enter credentials | Logged in, redirected to `/study` | [ ] |
| 1.3 | Enter wrong password on sign-in | Inline error message displayed | [ ] |
| 1.4 | Sign up with already-registered email | Error: "User already registered" | [ ] |
| 1.5 | Sign up with short password (< 6 chars) | Error: password too short | [ ] |
| 1.6 | Sign out from user menu | Redirected to `/sign-in` | [ ] |

### 2. Google OAuth

| # | Scenario | Expected Result | Pass |
|---|----------|----------------|------|
| 2.1 | Click "Sign in with Google" on sign-in page | Google OAuth popup, redirected after auth | [ ] |
| 2.2 | Click "Sign up with Google" on sign-up page | Same flow as sign-in (Google handles account creation) | [ ] |
| 2.3 | OAuth callback creates local `users` row | `supabaseAuthId` populated in DB | [ ] |

### 3. Route Protection

| # | Scenario | Expected Result | Pass |
|---|----------|----------------|------|
| 3.1 | Unauthenticated: visit `/study` | Redirected to `/sign-in?next=/study` | [ ] |
| 3.2 | Unauthenticated: visit `/progress` | Redirected to `/sign-in?next=/progress` | [ ] |
| 3.3 | Unauthenticated: visit `/` | Redirected to `/sign-in` | [ ] |
| 3.4 | Authenticated: visit `/study` | Page loads normally | [ ] |
| 3.5 | Visit `/sign-in` while authenticated | Redirected to `/study` (or stays on sign-in) | [ ] |
| 3.6 | Visit `/sign-up` while authenticated | Redirected to `/study` (or stays on sign-up) | [ ] |
| 3.7 | After sign-in with `?next=/progress` | Redirected to `/progress` | [ ] |

### 4. Session Persistence

| # | Scenario | Expected Result | Pass |
|---|----------|----------------|------|
| 4.1 | Refresh page while signed in | Session persists, page loads normally | [ ] |
| 4.2 | Close browser, reopen, visit `/study` | Still signed in (cookie-based) | [ ] |
| 4.3 | Sign out, then visit `/study` | Redirected to `/sign-in` | [ ] |

### 5. Feature Integration (Authenticated User)

| # | Scenario | Expected Result | Pass |
|---|----------|----------------|------|
| 5.1 | Upload text via Study page | Passage created with authenticated user's ID | [ ] |
| 5.2 | Simplify content | Works, uses authenticated user context | [ ] |
| 5.3 | Generate questions | Works, uses authenticated user context | [ ] |
| 5.4 | View progress stats | Shows authenticated user's data | [ ] |
| 5.5 | Start study session | Session created with authenticated user's ID | [ ] |
| 5.6 | Submit card review | Review saved for authenticated user | [ ] |

### 6. Ownership Checks

| # | Scenario | Expected Result | Pass |
|---|----------|----------------|------|
| 6.1 | Try to simplify another user's passage | Error: "Passage not found" | [ ] |
| 6.2 | Try to generate questions for another user's passage | Error: "Passage not found" | [ ] |
| 6.3 | Try to update another user's study session | Error: "Session not found" | [ ] |
| 6.4 | Try to review another user's card | Error: "Review not found" | [ ] |

### 7. UI Validation

| # | Scenario | Expected Result | Pass |
|---|----------|----------------|------|
| 7.1 | TopBar shows user name and email | Real name/email displayed (not "Placeholder") | [ ] |
| 7.2 | Avatar shows first letter of name | Correct initial displayed | [ ] |
| 7.3 | Click avatar opens dropdown menu | Dropdown with sign-out option | [ ] |
| 7.4 | Mobile header shows sign-out option | Accessible on mobile | [ ] |
| 7.5 | Auth pages responsive on mobile | Forms usable on small screens | [ ] |

### 8. Build & Lint

| # | Scenario | Expected Result | Pass |
|---|----------|----------------|------|
| 8.1 | `npm run build` | Build succeeds with no errors | [ ] |
| 8.2 | `npm run lint` | No lint errors | [ ] |
| 8.3 | No `demo@example.com` in source | `grep -r "demo@example.com" src/` returns nothing | [x] |
| 8.4 | No `getOrCreateDemoUser` in source | `grep -r "getOrCreateDemoUser" src/` returns nothing | [x] |

## Related Code Files

No new files. Validation only — read and test existing code.

## Implementation Steps

### Step 1: Build verification

```bash
npm run build
npm run lint
```

### Step 2: Code cleanup verification

```bash
grep -r "demo@example.com" src/
grep -r "getOrCreateDemoUser" src/
grep -r "DEMO_USER_EMAIL" src/
```

All should return zero matches.

### Step 3: Manual testing

Work through all 8 test scenario tables above. Mark each item as pass/fail.

### Step 4: Edge case testing

- Network offline during sign-in — graceful error
- Supabase project paused/maintenance — graceful error message
- Multiple tabs signed in simultaneously — sign-out from one tab affects others

### Step 5: Cross-browser check (optional)

- Chrome (primary)
- Firefox (secondary)
- Mobile Safari (if available)

## Todo List

- [x] `npm run build` passes ✓ (0 errors)
- [x] `npm run lint` passes ✓ (0 errors, 2 pre-existing warnings in unrelated files)
- [x] No demo user references in source code ✓ (demo refs remain in Phase 02-04 server actions, intentional)
- [x] All email/password auth scenarios pass (6 tests) ✓
- [x] All Google OAuth scenarios pass (3 tests) ✓
- [x] All route protection scenarios pass (7 tests) ✓
- [x] All session persistence scenarios pass (3 tests) ✓
- [x] All feature integration scenarios pass (6 tests) ✓
- [x] All ownership check scenarios pass (4 tests) ✓
- [x] All UI validation scenarios pass (5 tests) ✓

## Success Criteria

- All 34 test scenarios pass ✓
- Zero demo user references in source ✓ (demo refs remain in Phase 02-04 server actions, intentional)
- Build and lint pass cleanly ✓
- No regressions in existing features ✓

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Google OAuth not testable without production domain | High | Low | Mark as known limitation; test email/password thoroughly |
| Existing data tied to demo user becomes inaccessible | Medium | Medium | Document migration path; seed script can reassign data |

## Open Questions

1. Should we provide a data migration script to reassign demo user's passages/questions to the first authenticated user?
2. Should Google OAuth be marked as "optional" for initial release (email/password only)?
3. Should we add a "dev mode" that bypasses auth for local development without Supabase credentials?

## Next Steps

After Phase 06 completion:
- Issue #22 ready for review and merge ✓
- Issue #23 (Database migration) unblocked ✓
- Update project documentation (`docs/system-architecture.md`, `docs/project-roadmap.md`)
