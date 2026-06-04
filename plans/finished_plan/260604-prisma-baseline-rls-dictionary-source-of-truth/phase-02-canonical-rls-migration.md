---
phase: 2
title: "Canonical RLS Migration"
status: completed
priority: P1
effort: "3h"
dependencies: [1]
---

# Phase 2: Canonical RLS Migration

## Overview

Create a single Prisma-owned canonical RLS SQL file under `prisma/rls/`, copy
that SQL into a dedicated Prisma migration, and delete the Supabase-side
duplicate. RLS must be enabled on every `public` table, with ownership policies
for user-owned tables and no policies for dictionary or audit/internal tables.

## Requirements

- Functional: every `public` table has RLS enabled.
- Functional: user-owned tables have explicit `SELECT`, `INSERT`, `UPDATE`, and
  `DELETE` ownership policies.
- Functional: `questions` policies derive ownership through the parent
  `passages` row.
- Functional: dictionary and audit/internal tables have RLS enabled but no
  anon/authenticated policies.
- Functional: the `handle_new_user` trigger remains intact.
- Non-functional: do not use `FORCE ROW LEVEL SECURITY`.

## Architecture

The canonical SQL lives under `prisma/rls/` and is copied verbatim into the
corresponding Prisma migration. The source file is the reviewable version; the
migration is the executable history. Verification must prove the two files are
byte-identical so the repo cannot drift between a guide and the applied SQL.

The canonical policy set should cover the full public schema surface:

- `profiles`
- `passages`
- `study_chat_messages`
- `questions`
- `card_reviews`
- `study_sessions`
- `translation_caches`
- `translation_histories`
- `vocabulary_items`
- `dictionary_entries`
- `dictionary_senses`
- `dictionary_translations`
- `dictionary_aliases`
- `dictionary_source_audits`

## Related Code Files

- Create: `prisma/rls/README.md`
- Create: `prisma/rls/enable_rls.sql`
- Create: `prisma/migrations/<new-rls-migration>/migration.sql`
- Modify: `supabase/config.toml`
- Delete: `supabase/migrations/enable_rls.sql`
- Modify: `prisma/SECURITY.md`

## Implementation Steps

1. Document the RLS ownership model and maintenance workflow in
   `prisma/rls/README.md`.
2. Write the canonical SQL to enable RLS on every public table and add the
   required ownership policies.
3. Copy the canonical SQL into a dedicated Prisma migration without changing
   the SQL text.
4. Remove the Supabase migration copy and clear `supabase/config.toml` entries
   that point at Supabase-managed SQL migrations or seed files.
5. Verify the canonical SQL and migration SQL are identical.

## Success Criteria

- [ ] RLS is enabled on all public tables.
- [ ] User-owned tables have full ownership policies.
- [ ] Dictionary and audit/internal tables remain server-only by default.
- [ ] The canonical RLS SQL and the Prisma migration SQL match exactly.
- [ ] `supabase/migrations/` no longer carries the executable RLS source.

## Risk Assessment

A missing policy will lock out direct Supabase access while RLS is enabled.
That is acceptable only if the migration is verified before the database is
reset and replayed.
