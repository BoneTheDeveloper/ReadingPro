---
phase: 1
title: "Data Model, Normalization, and Alias Lookup"
status: pending
priority: P1
effort: "4h"
dependencies: []
---

# Phase 1: Data Model, Normalization, and Alias Lookup

## Overview

Establish the local dictionary foundation required by issue #57: shared normalization, a richer flat learner-facing `DictionaryEntry`, and indexed `DictionaryAlias` lookup for common variants.

## Requirements

- Functional: Normalize dictionary terms by lowercasing, trimming, collapsing whitespace, and stripping noisy surrounding punctuation.
- Functional: Replace the current thin dictionary row with a richer flat learner entry: `displayTerm`, `primaryTranslation`, `translations`, `shortDefinition`, `type`, `frequencyRank`, `source`, `confidence`, and `reviewed`.
- Functional: Add `DictionaryAlias` for indexed variant lookup by `normalizedAlias`.
- Functional: Alias reasons support `plural`, `past_tense`, `common_variant`, `manual`, and `phrase_variant`.
- Functional: Generate deterministic `normalizedKey` values from normalized term, source language, and target language.
- Non-functional: Keep the model intentionally flat; do not build `Lexeme`, `Sense`, or `Example` tables for MVP.
- Non-functional: Do not add raw large text indexes; use normalized fields and hashed keys.

## Architecture

Move dictionary normalization out of `src/lib/db/translation-queries.ts` into a shared dictionary-owned helper, then import it from DB queries, seed script, resolver tests, and API paths. Keep `DictionaryEntry` as the canonical local learner-facing row, but migrate it to hold the richer flat fields. Add `DictionaryAlias` as a separate table because aliases affect lookup behavior and need direct indexed access. Verify indexes for exact term lookup, alias lookup, and prefix suggest; add a migration because the dev DB can be overwritten.

## Related Code Files

- Modify: `/home/luc/Project/english-reading-training-app/prisma/schema.prisma`
- Create: `/home/luc/Project/english-reading-training-app/prisma/migrations/<timestamp>_dictionary_mvp_foundation/migration.sql`
- Modify: `/home/luc/Project/english-reading-training-app/prisma/seed-dictionary.ts`
- Create: `/home/luc/Project/english-reading-training-app/src/lib/dictionary/normalize-dictionary-term.ts`
- Modify: `/home/luc/Project/english-reading-training-app/src/lib/db/dictionary-queries.ts`
- Modify: `/home/luc/Project/english-reading-training-app/src/lib/db/translation-queries.ts`
- Modify: `/home/luc/Project/english-reading-training-app/docs/database/data-dictionary.md`

## Implementation Steps

1. Create `normalizeDictionaryTerm()` in `src/lib/dictionary/normalize-dictionary-term.ts`.
2. Update existing imports so DB helpers, resolver, routes, and seed script use the same normalization.
3. Migrate `DictionaryEntry.translation` into `primaryTranslation` and add `displayTerm`, `translations`, `shortDefinition`, `frequencyRank`, and `reviewed`.
4. Add `DictionaryAlias` with `normalizedAlias`, `entryId`, `sourceLanguage`, `targetLanguage`, `reason`, timestamps, unique normalized alias key, and indexes for lookup.
5. Update dictionary query helpers so lookup order is exact entry -> exact alias -> safe tiny rules -> fallback.
6. Keep tiny rules conservative and deterministic: plural `s/es`, `ies -> y`, regular `ed -> base`; never run broad stemming.
7. Update generated Prisma client after migration in implementation phase.
8. Update database docs for model fields, alias behavior, and dictionary index purpose.

## Success Criteria

- [ ] `DictionaryEntry` supports primary translation, alternatives, short definition, frequency rank, confidence, reviewed flag, and source metadata.
- [ ] `DictionaryAlias` supports indexed exact alias lookup.
- [ ] Normalization behavior is shared across seed, lookup, suggest, and quick translate.
- [ ] Lookup order is exact entry -> alias -> safe tiny rules -> fallback.
- [ ] Dictionary index strategy is documented and verified.

## Risk Assessment

Main risk is overbuilding a real dictionary schema too early. Mitigate by keeping one flat learner entry plus one alias table only. Second risk is bad normalization or bad safe-rule matching creating wrong translations; mitigate with shared helper tests, alias-first lookup, and a very small approved rule list.
