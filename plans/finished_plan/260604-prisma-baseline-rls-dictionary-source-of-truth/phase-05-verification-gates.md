---
phase: 5
title: "Verification Gates"
status: completed
priority: P1
effort: "3h"
dependencies: [1, 2, 3, 4]
---

# Phase 5: Verification Gates

## Overview

Run the destructive reset and the full verification suite that proves the new
baseline, RLS migration, seed layout, and docs all behave as intended. This is
the gate that confirms the repo is actually back in a clean, reproducible
state.

## Requirements

- Functional: the fresh migration history replays on a reset development
  database.
- Functional: the canonical RLS SQL and the applied migration SQL are identical.
- Functional: the normalized seed imports successfully and preserves existing
  dictionary behavior.
- Non-functional: typecheck, lint, and tests remain green.

## Related Code Files

- Review: `prisma/migrations/*`
- Review: `prisma/rls/enable_rls.sql`
- Review: `prisma/seed.ts`
- Review: `scripts/dictionary/*`
- Review: `prisma/MIGRATIONS.md`
- Review: `prisma/SECURITY.md`

## Implementation Steps

1. Verify the canonical RLS SQL matches the migration copy exactly.
2. Run Prisma formatting, validation, and client generation checks.
3. Reset the development database and replay the rewritten migration history.
4. Seed the normalized dictionary data and run the dictionary validation script.
5. Run typecheck, lint, and the full automated test suite.
6. Confirm the migration diff is clean and the repository no longer depends on
   the old Supabase migration path.

## Success Criteria

- [ ] The database resets and replays against the new migration history.
- [ ] The canonical RLS file matches the executable migration copy.
- [ ] The normalized dictionary seed imports and validates cleanly.
- [ ] Typecheck, lint, and tests pass.
- [ ] No stale migration or seed path remains in the active workflow.

## Risk Assessment

The reset gate is intentionally destructive. If it fails, the failure should be
treated as a real migration or seed problem, not papered over with a partial
fix.
