---
phase: 9
title: "Cleanup & Test"
status: pending
priority: P1
effort: "30min"
dependencies: ["phase-03-middleware", "phase-04-auth-server", "phase-05-auth-client", "phase-06-auth-ui", "phase-07-feature-updates", "phase-08-database-migration"]
---

# Phase 9: Cleanup & Test

## Overview

Remove Clerk packages, clean up old files, run tests, and verify the migration works end-to-end.

## Requirements

- Functional: Sign-in, sign-up, sign-out, protected routes all work
- Non-functional: TypeScript compiles, tests pass, no Clerk references remain

## Related Code Files

**Delete:**
- `src/services/clerk.ts` — Replaced by `src/lib/auth-server.ts`
- `src/app/api/webhooks/clerk/route.ts` — No longer needed
- `src/components/layout/auth-controls.tsx` — Replaced with Better Auth version

**Uninstall:**
- `@clerk/nextjs` from package.json

**Modify:**
- `.env.local` — Remove Clerk env vars
- `package.json` — Remove `@clerk/nextjs`

## Implementation Steps

### 9.1 Remove Clerk Packages

```bash
pnpm remove @clerk/nextjs
```

### 9.2 Delete Old Files

```bash
rm src/services/clerk.ts
rm src/app/api/webhooks/clerk/route.ts
```

### 9.3 Clean Environment Variables

Remove from `.env.local`:
```env
# Remove these lines:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
CLERK_WEBHOOK_SIGNING_SECRET=...
```

### 9.4 Run TypeScript Check

```bash
pnpm run typecheck
```

Fix any remaining Clerk references.

### 9.5 Run Lint

```bash
pnpm run lint
```

### 9.6 Test Auth Flow Manually

1. Start dev server: `pnpm dev`
2. Visit `/sign-in` — should show custom sign-in form
3. Sign up with email/password
4. Verify UserProfile created in database
5. Sign in with new account
6. Verify redirected to dashboard
7. Visit protected route — should allow access
8. Sign out — should redirect to home
9. Visit protected route — should redirect to sign-in

### 9.7 Test OAuth Flow (if configured)

1. Click Google/GitHub button
2. Complete OAuth flow
3. Verify redirected back and logged in
4. Verify UserProfile created

### 9.8 Run Tests

```bash
pnpm test
```

If tests fail due to auth mocking, update test setup to mock Better Auth sessions.

## Success Criteria

- [ ] `@clerk/nextjs` removed from package.json
- [ ] No files import from `@clerk/nextjs`
- [ ] TypeScript compiles without errors
- [ ] Lint passes
- [ ] Sign-in flow works (email/password)
- [ ] Sign-up flow works (email/password)
- [ ] Sign-out works
- [ ] Protected routes redirect correctly
- [ ] Existing features (vocabulary, upload, etc.) work with new auth

## Risk Assessment

- **Risk:** Existing test mocks reference Clerk
- **Mitigation:** Update test mocks to use Better Auth session pattern

## Next Steps

Migration complete! OAuth providers can be added by:
1. Creating OAuth app in provider console
2. Adding `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` to env
3. Adding provider config to `src/lib/auth.ts`
4. Adding button to auth forms

## Unresolved Questions

1. **Existing users:** Do existing Clerk users need migration? (Recommend clean slate for MVP)
2. **Email verification:** Enable `requireEmailVerification: true` for production?
3. **OAuth providers:** Which providers to enable? (Google, GitHub, or both?)
