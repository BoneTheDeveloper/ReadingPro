---
phase: 1
title: Contracts and Data Model
status: completed
priority: P1
effort: 3h
dependencies: []
---

# Phase 1: Contracts and Data Model

## Overview

Define the shared TypeScript contracts and database schema for context-aware translation, dictionary-backed lookup, caching, translation history, and saved vocabulary. This phase establishes the persistent contract used by the API and Study UI.

## Requirements

- Functional: Add typed shapes for quick translation, detailed translation, captured text selection, and saved vocabulary.
- Functional: Add Prisma models for translation cache, translation history, dictionary entries, and vocabulary items.
- Non-functional: Keep indexes compact by using hashed keys instead of raw long text unique constraints.
- Non-functional: Scope all rows by `userId` and `sourceId`, with cascade deletion from users/passages.

## Architecture

Add four database tables:

- `TranslationCache`: hashed `cacheKey`, user/source ownership, selected text, context sentence, source/target language, mode, structured AI response JSON.
- `TranslationHistory`: append-only user lookup history for successful translations.
- `DictionaryEntry`: reusable English-to-Vietnamese dictionary/provider cache for single words and common phrases, including optional type, pronunciation, meanings/examples JSON, and lookup source.
- `VocabularyItem`: deduplicated saved vocabulary item keyed by user/source/text/context/target language hash.

V1 seed strategy:

- Keep the initial small dictionary as a local TypeScript seed in the dictionary provider, not a required production migration seed.
- When a seeded entry is used, upsert it into `DictionaryEntry` so future lookups can use the DB-backed cache.
- Do not add an external dictionary API or vector DB in v1.

Expose shared study feature types from `src/features/study/study-types.ts`:

- `TranslationSelection`
- `QuickTranslationData`
- `DetailedTranslationData`
- `TranslationProvider`: `"cache" | "dictionary" | "ai"`

## Related Code Files

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_inline_translation/migration.sql`
- Modify: `src/features/study/study-types.ts`

## Implementation Steps

1. Add `TranslationCache`, `TranslationHistory`, `DictionaryEntry`, and `VocabularyItem` models to Prisma.
2. Add relations from `UserProfile` and `Passage` to the new models.
3. Add unique hashed keys for cache and vocabulary dedupe.
4. Add normalized dictionary lookup keys for source language, target language, and normalized term.
5. Add practical lookup indexes for `userId/sourceId/createdAt`, `userId/sourceId/targetLanguage`, and dictionary term/language lookup.
6. Generate a new migration with Prisma tooling and review the SQL before committing.
7. Add Study feature TypeScript interfaces for selection and translation responses.
8. Define the v1 seeded dictionary contract in the dictionary provider: normalized term, translation, type, optional pronunciation, examples, related words, source, and confidence.

## Success Criteria

- [ ] Prisma schema validates and generated migration matches the intended tables/indexes/foreign keys.
- [ ] No existing `Question`, `CardReview`, or study session schema is changed.
- [ ] Saved vocabulary has its own model and does not overload comprehension flashcards.
- [ ] Dictionary lookup data has its own model/provider cache and is not stored as passage-specific history.
- [ ] Seeded dictionary entries can be represented in `DictionaryEntry` without a separate seed command.
- [ ] Types are exported from their owner file, with no broad barrel exports added.

## Risk Assessment

Database changes are the highest-risk part of the feature. Keep the migration additive only, avoid modifying old migrations, and do not run production-affecting migration commands during implementation without explicit approval.
