---
phase: 3
title: Docs fix + verification
status: completed
priority: P2
effort: 30-45m
dependencies:
  - 1
  - 2
---

# Phase 3: Docs fix + verification

## Overview

Correct the drifted `auth.md` so docs match code (profile creation now exists;
`UserProfile.id` is a real FK), then run the full verification pass across all
three phases.

## Requirements

- Functional: `docs/Architecture/auth.md` reflects the actual auth flow and schema.
- Non-functional: typecheck, lint, build clean; live FK outage confirmed fixed.

## Architecture

Two false claims in `docs/Architecture/auth.md` to fix:

- ~line 106: "linked by the same value, **not a foreign key**" — schema.prisma
  ~line 131 (`user User @relation(fields: [id], references: [id], onDelete:
  Cascade)`) is a real FK. Correct it.
- ~lines 115 / 125: "Creates/Ensures UserProfile via afterSignUp/afterSignIn
  callback" — replace with the actual mechanism: `databaseHooks.user.create.after`
  upserts the `UserProfile` (added in Phase 1).

## Related Code Files

- Modify: `docs/Architecture/auth.md`
- Read for context: `src/lib/auth/auth.ts` (post Phase 1), `prisma/schema.prisma`

## Implementation Steps

1. Update `auth.md`: change the FK claim (~line 106) to state `UserProfile.id` is a
   FK to `User.id`. Update the Sign Up / Sign In flow descriptions (~115/125) to
   reference `databaseHooks.user.create.after` instead of the non-existent
   `afterSignUp`/`afterSignIn` callbacks.
2. Full verification:
   ```bash
   pnpm run typecheck
   pnpm run lint
   pnpm run build      # optional, catches route/RSC issues
   ```
3. Grep sweep (repeat Phase 2 gate) — zero matches outside `src/generated/`.
4. Manual smoke: sign up a new user → confirm `profiles` row exists → perform an
   upload → confirm no `P2003` FK violation in the server log. Load dashboard +
   landing → render without errors.

## Success Criteria

- [ ] `auth.md` FK claim corrected
- [ ] `auth.md` sign-up/sign-in flow references `databaseHooks.user.create.after`
- [ ] `pnpm run typecheck` clean
- [ ] `pnpm run lint` clean
- [ ] `pnpm run build` succeeds (if run)
- [ ] Grep sweep clean outside `src/generated/`
- [ ] Manual smoke: new user → profile row → upload works, no FK error
- [ ] Dashboard + landing render without errors

## Risk Assessment

- **Other docs reference study_sessions/progress** → grep `docs/` for
  `study_sessions`/`progress`/`learning-session` and update any stale mentions
  (e.g. `codebase-summary.md`) found during verification.
- **Build-only failures (RSC/route)** → run `pnpm run build` if the dashboard or
  landing changed materially.
