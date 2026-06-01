---
phase: 2
title: "Seed Fixture Pipeline"
status: in-progress
priority: P1
effort: "6h"
dependencies:
  - 1
---

# Phase 2: Seed Fixture Pipeline

## Overview

Replace the tiny test-derived seed with deterministic, reviewable, sense-based fixtures using a 3-tier dataset strategy. MVP seed scope is a representative reviewed fixture set, not a large content milestone.

## Requirements

- Functional: Use JSON as the source of truth; generated CSV is optional review output.
- Functional: Include enough reviewed fixtures to test exact lookup, aliases, phrases, multiple senses, status filtering, ranking, and source labels.
- Functional: Keep provider/tool output in ignored local draft files unless redistribution terms are explicitly approved.
- Functional: Validate translation status, source type, rank, reviewed availability, alias collisions, and primary uniqueness.
- Non-functional: Seed import is deterministic and idempotent.
- Non-functional: Seeder and validator accept a configurable dataset file path.

## Seed Dataset Strategy (3-Tier)

All datasets focus on EN-VI (English-to-Vietnamese) translation.

### Tier 1: `small-test.json`
- **Purpose:** Unit/integration test fixture
- **Size:** ~25 curated entries
- **Content:** Carefully selected entries covering all test scenarios:
  - Exact headword lookup (single-sense entries)
  - Alias resolution (variant, inflection, phrase aliases)
  - Phrasal verbs and compound terms
  - Multiple senses with different parts of speech
  - Status filtering (reviewed, approved, draft, deprecated)
  - Ranking and confidence ordering
  - Source label variety (seed, manual, provider)
- **Commit:** Yes, always in repo
- **Generation:** Hand-curated

### Tier 2: `common-1000.json`
- **Purpose:** Real MVP runtime data
- **Size:** 1000 common EN-VI word pairs
- **Content:** Most common English words with Vietnamese translations, generated from a curated word list with realistic definitions, examples, and multiple senses where applicable
- **Commit:** Yes
- **Generation:** Script-based from curated word list (`scripts/dictionary/generate-common-dataset.ts`)

### Tier 3: `generated-50000.json`
- **Purpose:** Performance benchmark
- **Size:** ~50,000 entries
- **Content:** Generated using random functions to stress-test lookup, suggest, and pagination
- **Commit:** No (gitignored)
- **Generation:** Script-based with random functions (`scripts/dictionary/generate-benchmark-dataset.ts`)
- **Note:** Regenerate locally when benchmarking needed

## Architecture

Fixtures live under `prisma/data/dictionary/en-vi/`. `prisma/seed-dictionary.ts` accepts a `--dataset` CLI arg (default: `common-1000`) and imports entries, senses, translations, aliases, and audits in stable order.

Translation fixture rows include `rank`, `sourceType`, `sourceName`, `reviewedAt`, and one primary translation per `senseId + targetLanguage`.

## Related Code Files

- Create: `prisma/data/dictionary/en-vi/small-test.json`
- Create: `prisma/data/dictionary/en-vi/common-1000.json` (generated)
- Create: `prisma/data/dictionary/en-vi/generated-50000.json` (gitignored, generated)
- Create: `scripts/dictionary/generate-common-dataset.ts`
- Create: `scripts/dictionary/generate-benchmark-dataset.ts`
- Modify: `scripts/dictionary/validate-seed.ts` (accept file path arg)
- Modify: `prisma/seed-dictionary.ts` (accept dataset arg)
- Modify: `.gitignore` (exclude `generated-*.json`)
- Modify: `package.json` (add generation and per-dataset scripts)

## Implementation Steps

1. Define the compact nested fixture schema for entries, senses, translations, aliases, and audit notes.
2. Create `small-test.json` with curated entries covering all test scenarios.
3. Create `generate-common-dataset.ts` with curated EN-VI word list to generate `common-1000.json`.
4. Create `generate-benchmark-dataset.ts` with random generation for `generated-50000.json`.
5. Update seeder to accept `--dataset` argument and resolve file path.
6. Update validator to accept fixture file path argument.
7. Add package scripts for generation, validation, and per-dataset seeding.
8. Update `.gitignore` to exclude `generated-*.json`.

## Success Criteria

- [ ] `small-test.json` covers all lookup and UI test scenarios (~25 entries).
- [ ] `common-1000.json` generated with 1000 realistic EN-VI entries.
- [ ] `generate-benchmark-dataset.ts` produces valid 50k-entry fixture.
- [ ] Validation accepts file path arg and passes on all generated datasets.
- [ ] Seed import accepts dataset arg and is repeatable without duplicate rows.
- [ ] No runtime route depends on provider calls.

## Risk Assessment

Licensing remains the main risk. Keep draft/provider output out of committed runtime fixtures unless redistribution is clearly approved. Generated datasets use app-owned Vietnamese translations, not provider output.
