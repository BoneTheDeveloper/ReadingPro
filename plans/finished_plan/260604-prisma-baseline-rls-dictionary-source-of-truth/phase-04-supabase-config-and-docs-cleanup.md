---
phase: 4
title: "Supabase Config and Docs Cleanup"
status: completed
priority: P2
effort: "2h"
dependencies: [2, 3]
---

# Phase 4: Supabase Config and Docs Cleanup

## Overview

Remove the stale Supabase migration path and update the runbooks and
documentation so they describe the new Prisma-only migration and seed model.
This phase keeps the operational story consistent after the file moves.

## Requirements

- Functional: `supabase/migrations/` no longer carries executable database
  history.
- Functional: `supabase/config.toml` no longer points at missing Supabase seed
  or migration SQL.
- Documentation: Prisma migration, security, and roadmap docs reflect the new
  source-of-truth layout.
- Non-functional: documentation updates must not imply any runtime contract or
  schema redesign.

## Architecture

Treat `prisma/MIGRATIONS.md` as the operational runbook for migration reset and
replay, and `prisma/SECURITY.md` as the RLS ownership summary. Any docs that
still reference `prisma/seed-dictionary.ts`, `common-1000.json`, or
`supabase/migrations/enable_rls.sql` must be updated to the new paths.

## Related Code Files

- Modify: `supabase/config.toml`
- Delete: `supabase/migrations/`
- Modify: `prisma/MIGRATIONS.md`
- Modify: `prisma/SECURITY.md`
- Modify if referenced: `docs/project-roadmap.md`
- Modify if referenced: `docs/database/data-dictionary.md`
- Modify if referenced: `docs/database/erd.md`

## Implementation Steps

1. Remove the Supabase migration copy and clear config references that point to
   it.
2. Update the Prisma migration runbook with the clean-history reset flow and
   the seed/RLS execution order.
3. Update the Prisma security note to point at the new RLS guide.
4. Sweep directly affected docs for old seed and migration path references.

## Success Criteria

- [ ] There is no executable Supabase SQL migration path left in the repo.
- [ ] The Prisma runbook documents the new reset/replay flow.
- [ ] The security docs point to the canonical RLS guide.
- [ ] Outdated seed and migration path references are removed from directly
  affected docs.

## Risk Assessment

The main risk here is stale documentation causing operators to run the wrong
reset or seed command. Keep the runbook precise and update only the docs that
actually reference the changed paths.
