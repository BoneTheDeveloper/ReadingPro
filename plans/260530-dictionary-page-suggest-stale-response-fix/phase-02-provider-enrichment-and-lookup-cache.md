---
phase: 2
title: "Offline Seed Generation and Review Fixtures"
status: pending
priority: P1
effort: "3h"
dependencies:
  - 1
---

# Phase 2: Offline Seed Generation and Review Fixtures

## Overview

Build the versioned in-repo dictionary seed corpus through offline generation, enrichment, validation, and manual review. Runtime lookup must not depend on external providers for MVP.

## Requirements

- Functional: Seed data starts from `wordfreq` / exported `wordfreq-en-25000`, after license verification, and selects top 3k learner words initially with a path to 10k.
- Functional: Offline generation enriches draft entries with EN-VI translation, optional alternatives, optional very short learner definition, type, frequency rank, source, confidence, reviewed flag, and aliases.
- Functional: Do not store provider-generated translation/definition output when source terms or licensing are unclear.
- Functional: Do not import Wiktionary directly into MVP seed data. `shortDefinition` is manually written for top reviewed words or left empty.
- Functional: Top 500 entries must be reviewed for MVP; top 1000 is preferred; reviewing all 3k is not required before MVP.
- Functional: JSON fixtures are source of truth; generate CSV for review workflow.
- Functional: Seed fixtures are committed in repo and imported through Prisma seed deterministically.
- Functional: License and source notes are committed beside the fixtures.
- Functional: Manual review workflow marks high-frequency entries as reviewed before MVP release.
- Non-functional: No runtime provider calls in `/api/dictionary`, `/api/dictionary/suggest`, or quick translate for MVP.
- Non-functional: Do not import a large external bilingual dictionary unless license is unquestionably safe.

## Architecture

Create an offline seed workflow under `scripts/dictionary/` and versioned data under `prisma/data/dictionary/en-vi/`. Provider/API calls, if used, happen only in offline scripts that generate draft fixtures. The DB receives only reviewed/versioned fixture output through `prisma/seed-dictionary.ts`. Runtime lookup stays local: exact entry -> alias -> safe tiny candidate rules -> deterministic fallback. JSON is the committed source of truth; CSV is generated for human review.

## Related Code Files

- Create: `/home/luc/Project/english-reading-training-app/prisma/data/dictionary/en-vi/entries.json`
- Create: `/home/luc/Project/english-reading-training-app/prisma/data/dictionary/en-vi/aliases.json`
- Create: `/home/luc/Project/english-reading-training-app/prisma/data/dictionary/en-vi/review.csv`
- Create: `/home/luc/Project/english-reading-training-app/prisma/data/dictionary/en-vi/sources.md`
- Create: `/home/luc/Project/english-reading-training-app/prisma/data/dictionary/en-vi/review-notes.md`
- Create: `/home/luc/Project/english-reading-training-app/scripts/dictionary/generate-seed.ts`
- Create: `/home/luc/Project/english-reading-training-app/scripts/dictionary/validate-seed.ts`
- Modify: `/home/luc/Project/english-reading-training-app/prisma/seed-dictionary.ts`
- Modify: `/home/luc/Project/english-reading-training-app/package.json`
- Modify: `/home/luc/Project/english-reading-training-app/docs/database/data-dictionary.md`

## Implementation Steps

1. Verify and document `wordfreq` / exported `wordfreq-en-25000` redistribution terms before committing derived fixtures.
2. Add fixture schema for entries and aliases. Validate required fields, normalized uniqueness, alias uniqueness, source fields, confidence bounds, and reviewed boolean.
3. Implement `generate-seed.ts` to create draft entries from `wordfreq-en-25000` and optional offline provider/manual enrichment.
4. Add a CSV export path for review, generated from JSON fixtures rather than edited as source of truth.
5. Implement `validate-seed.ts` to fail on empty normalized terms, duplicate normalized keys, duplicate aliases, missing source/license metadata, invalid translation arrays, unsafe alias loops, or provider output with unclear source terms.
6. Update `seed-dictionary.ts` to read committed JSON fixtures, upsert `DictionaryEntry` and `DictionaryAlias`, and report inserted/updated/skipped counts.
7. Add package scripts for seed generation, review CSV generation, seed validation, and DB import.
8. Manually review top 500 entries before MVP; attempt top 1000 if schedule allows.

## Success Criteria

- [ ] Seed fixtures contain at least 3k initial learner entries and can scale to 10k.
- [ ] Fixture source/license notes are committed and clear.
- [ ] Top 500 entries are marked reviewed; top 1000 is preferred.
- [ ] JSON is source of truth and CSV review file is generated from JSON.
- [ ] Seed validation fails on duplicates, missing translations, missing sources, and alias conflicts.
- [ ] Seed validation blocks unclear provider output and direct Wiktionary import.
- [ ] Prisma seed is idempotent and imports both entries and aliases deterministically.
- [ ] No runtime route depends on external provider calls for MVP.

## Risk Assessment

Main risk is licensing. Do not commit derived bilingual data unless source terms are safe. Second risk is low-quality provider output. Mitigate by keeping confidence/reviewed metadata, manually reviewing at least top 500, not storing unclear provider output, and treating generated fixtures as drafts until validated.
