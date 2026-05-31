---
phase: 1
title: "Sense-Based Schema and Lookup Foundation"
status: pending
priority: P1
effort: "5h"
dependencies: []
---

# Phase 1: Sense-Based Schema and Lookup Foundation

## Overview

Replace the current flat dictionary table with a sense-based local dictionary model and shared lookup/normalization primitives.

## Requirements

- Functional: Replace thin `DictionaryEntry` rows with entries, senses, translations, aliases, and audit metadata.
- Functional: Store target-language text and provenance on `DictionaryTranslation`.
- Functional: Enforce exactly one primary translation per `senseId + targetLanguage`.
- Functional: Add aliases for inflections, phrases, typos, and variants.
- Functional: Share normalization across seed import, API routes, DB helpers, and quick translate.
- Non-functional: Keep the MVP learner-focused and avoid a full lexical graph.

## Architecture

`DictionaryEntry` owns the canonical English headword/lemma. `DictionarySense` owns POS, English definition/example, tags, and usage ordering. `DictionaryTranslation` owns Vietnamese text, rank, confidence, status, provenance, review timestamp, and primary selection. `DictionaryAlias` points normalized variants to canonical entries.

The migration may destructively replace the old dictionary table. Add validation and, where practical, a DB constraint or partial unique index so each `senseId + targetLanguage` has one and only one `isPrimary = true` translation.

`DictionaryTranslation` must include:

```ts
{
  id: string;
  senseId: string;
  targetLanguage: string;
  translation: string;
  isPrimary: boolean;
  rank: number;
  confidence?: number;
  status: "draft" | "reviewed" | "approved" | "deprecated";
  sourceType: "seed" | "manual" | "provider" | "llm" | "mixed";
  sourceName?: string;
  reviewedAt?: Date;
}
```

## Related Code Files

- Modify: `/home/luc/Project/english-reading-training-app/prisma/schema.prisma`
- Create: `/home/luc/Project/english-reading-training-app/prisma/migrations/<timestamp>_dictionary_mvp_foundation/migration.sql`
- Create: `/home/luc/Project/english-reading-training-app/src/lib/dictionary/normalize-dictionary-term.ts`
- Create: `/home/luc/Project/english-reading-training-app/src/lib/dictionary/resolve-dictionary-lookup.ts`
- Modify: `/home/luc/Project/english-reading-training-app/src/lib/db/dictionary-queries.ts`
- Modify: `/home/luc/Project/english-reading-training-app/docs/database/data-dictionary.md`

## Implementation Steps

1. Add the new Prisma models and destructive migration.
2. Add dictionary-owned normalization and deterministic key helpers.
3. Add DB helpers for exact headword, alias, candidate lookup, status-filtered sense loading, and usage-ranked DTO loading.
4. Add source-label mapping in the backend from `sourceType/sourceName` to display-ready labels.
5. Update generated Prisma client and docs.

## Success Criteria

- [ ] Schema supports entries, senses, translations with provenance, aliases, and audit metadata.
- [ ] Runtime-available translations validate exactly one primary row per `senseId + targetLanguage`.
- [ ] Headword and alias lookup paths are indexed.
- [ ] Draft/deprecated rows can be excluded by default.
- [ ] Backend can produce a stable `sourceLabel` from translation provenance.

## Risk Assessment

The main risk is overbuilding dictionary semantics. Keep this phase to schema, lookup foundations, primary translation uniqueness, and provenance labels.
