# Row-Level Security (RLS)

## Ownership

This directory contains the **canonical** RLS SQL for the public schema. The file `enable_rls.sql` is the reviewable source of truth. A copy is placed verbatim in the corresponding Prisma migration under `prisma/migrations/`.

The two files must stay byte-identical. If they drift, the migration replay will diverge from the documented policy set.

## Policy Model

| Category | Tables | Policy |
|----------|--------|--------|
| User-owned | profiles, passages, study_chat_messages, card_reviews, study_sessions, translation_caches, translation_histories, vocabulary_items | Full CRUD scoped to `userId = auth.uid()` |
| Indirect ownership | questions | CRUD scoped via parent passage ownership |
| Server-only | dictionary_entries, dictionary_senses, dictionary_translations, dictionary_aliases, dictionary_source_audits | RLS enabled, no anon/authenticated policies |

## Maintenance

1. Edit `enable_rls.sql` in this directory.
2. Copy the **exact same content** into the corresponding Prisma migration SQL file.
3. Verify both files match before committing.

Prisma connects via a service role with `bypassrls`, so these policies only apply to direct Supabase client access. App-level auth (`getAuthenticatedUser()`) remains the primary authorization layer.
