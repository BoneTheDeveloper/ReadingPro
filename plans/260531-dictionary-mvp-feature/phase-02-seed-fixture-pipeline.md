---
phase: 2
title: "Seed Fixture Pipeline"
status: pending
priority: P1
effort: "4h"
dependencies:
  - 1
---

# Phase 2: Seed Fixture Pipeline

## Overview

Replace the tiny test-derived seed with deterministic, reviewable, sense-based fixtures. MVP seed scope is a representative reviewed fixture set, not a large content milestone.

## Requirements

- Functional: Use JSON as the source of truth; generated CSV is optional review output.
- Functional: Include enough reviewed fixtures to test exact lookup, aliases, phrases, multiple senses, status filtering, ranking, and source labels.
- Functional: Keep provider/tool output in ignored local draft files unless redistribution terms are explicitly approved.
- Functional: Validate translation status, source type, rank, reviewed availability, alias collisions, and primary uniqueness.
- Non-functional: Seed import is deterministic and idempotent.

## Architecture

Fixtures live under `prisma/data/dictionary/en-vi/`. `prisma/seed-dictionary.ts` imports entries, senses, translations, aliases, and audits in stable order. Candidate/ranking sources may provide English signals only; committed definitions/translations/examples must be app-owned or license-approved.

Translation fixture rows include `rank`, `sourceType`, `sourceName`, `reviewedAt`, and one primary translation per `senseId + targetLanguage`.

## Related Code Files

- Create: `/home/luc/Project/english-reading-training-app/prisma/data/dictionary/en-vi/entries.json`
- Create: `/home/luc/Project/english-reading-training-app/prisma/data/dictionary/en-vi/candidates.json`
- Create: `/home/luc/Project/english-reading-training-app/prisma/data/dictionary/en-vi/sources.md`
- Modify: `/home/luc/Project/english-reading-training-app/.gitignore`
- Create: `/home/luc/Project/english-reading-training-app/scripts/dictionary/validate-seed.ts`
- Modify: `/home/luc/Project/english-reading-training-app/prisma/seed-dictionary.ts`
- Modify: `/home/luc/Project/english-reading-training-app/package.json`

## Implementation Steps

1. Define the compact nested fixture schema for entries, senses, translations, aliases, and audit notes.
2. Add representative reviewed fixtures for the runtime and UI scenarios.
3. Add seed validation for invalid statuses/source types, missing rank, missing senses, alias collisions, duplicate headwords, and zero/multiple primary translations.
4. Update the seed importer to upsert/delete dependent rows deterministically.
5. Add package scripts for validation and import.

## Success Criteria

- [ ] Representative reviewed fixtures cover all planned lookup and UI scenarios.
- [ ] Validation rejects invalid `sourceType`, missing rank, missing senses, alias conflicts, and zero/multiple primary translations.
- [ ] Seed import is repeatable without duplicate rows.
- [ ] No runtime route depends on provider calls.

## Risk Assessment

Licensing remains the main risk. Keep draft/provider output out of committed runtime fixtures unless redistribution is clearly approved.
