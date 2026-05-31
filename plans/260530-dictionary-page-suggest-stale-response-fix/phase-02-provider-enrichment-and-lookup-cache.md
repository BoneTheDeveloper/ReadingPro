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

- Functional: Seed data starts from a safe public English frequency wordlist and selects top 3k learner words initially, with a path to 10k.
- Functional: Offline generation enriches draft entries with EN-VI translation, optional alternatives, optional short learner definition, type, frequency rank, source, confidence, reviewed flag, and aliases.
- Functional: Seed fixtures are committed in repo and imported through Prisma seed deterministically.
- Functional: License and source notes are committed beside the fixtures.
- Functional: Manual review workflow marks high-frequency entries as reviewed before MVP release.
- Non-functional: No runtime provider calls in `/api/dictionary`, `/api/dictionary/suggest`, or quick translate for MVP.
- Non-functional: Do not import a large external bilingual dictionary unless license is unquestionably safe.

## Architecture

Create an offline seed workflow under `scripts/dictionary/` and versioned data under `prisma/data/dictionary/en-vi/`. Provider/API calls, if used, happen only in offline scripts that generate draft fixtures. The DB receives only reviewed/versioned fixture output through `prisma/seed-dictionary.ts`. Runtime lookup stays local: exact entry -> alias -> safe tiny rules -> deterministic fallback.

## Related Code Files

- Create: `/home/luc/Project/english-reading-training-app/prisma/data/dictionary/en-vi/entries.json`
- Create: `/home/luc/Project/english-reading-training-app/prisma/data/dictionary/en-vi/aliases.json`
- Create: `/home/luc/Project/english-reading-training-app/prisma/data/dictionary/en-vi/sources.md`
- Create: `/home/luc/Project/english-reading-training-app/prisma/data/dictionary/en-vi/review-notes.md`
- Create: `/home/luc/Project/english-reading-training-app/scripts/dictionary/generate-seed.ts`
- Create: `/home/luc/Project/english-reading-training-app/scripts/dictionary/validate-seed.ts`
- Modify: `/home/luc/Project/english-reading-training-app/prisma/seed-dictionary.ts`
- Modify: `/home/luc/Project/english-reading-training-app/package.json`
- Modify: `/home/luc/Project/english-reading-training-app/docs/database/data-dictionary.md`

## Implementation Steps

1. Choose and document the first approved public frequency source with redistribution terms.
2. Add fixture schema for entries and aliases. Validate required fields, normalized uniqueness, alias uniqueness, source fields, confidence bounds, and reviewed boolean.
3. Implement `generate-seed.ts` to create draft entries from frequency input and optional offline provider/manual enrichment.
4. Implement `validate-seed.ts` to fail on empty normalized terms, duplicate normalized keys, duplicate aliases, missing source/license metadata, invalid translation arrays, or unsafe alias loops.
5. Update `seed-dictionary.ts` to read committed fixtures, upsert `DictionaryEntry` and `DictionaryAlias`, and report inserted/updated/skipped counts.
6. Add package scripts for seed generation, seed validation, and DB import.
7. Manually review the agreed top-frequency threshold and mark reviewed rows in fixture data.

## Success Criteria

- [ ] Seed fixtures contain at least 3k initial learner entries and can scale to 10k.
- [ ] Fixture source/license notes are committed and clear.
- [ ] High-frequency review threshold is marked through `reviewed`.
- [ ] Seed validation fails on duplicates, missing translations, missing sources, and alias conflicts.
- [ ] Prisma seed is idempotent and imports both entries and aliases deterministically.
- [ ] No runtime route depends on external provider calls for MVP.

## Risk Assessment

Main risk is licensing. Do not commit derived bilingual data unless source terms are safe. Second risk is low-quality provider output. Mitigate by keeping confidence/reviewed metadata, manually reviewing high-frequency entries, and treating generated fixtures as drafts until validated.
