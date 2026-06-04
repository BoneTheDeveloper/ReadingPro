---
phase: 3
title: "Dictionary Seed Normalization"
status: completed
priority: P1
effort: "5h"
dependencies: [1, 2]
---

# Phase 3: Dictionary Seed Normalization

## Overview

Normalize the production dictionary seed into split canonical files under
`prisma/data/dictionary/en-vi/`, keep the small test fixture isolated under
`fixtures/`, and replace the old seed/import helper set with the new naming and
layout. This is a structural move only; the dictionary content itself must not
change semantically.

## Requirements

- Functional: canonical production seed data is split across
  `entries.json`, `senses.json`, `translations.json`, and `aliases.json`.
- Functional: `fixtures/small-test.json` remains separate and is not merged
  into the canonical production seed.
- Functional: `prisma/seed.ts` becomes the seed entrypoint.
- Functional: helper scripts use the new names and live under
  `scripts/dictionary/`.
- Non-functional: the current dictionary semantics, ordering, and lookup
  behavior are preserved.

## Architecture

The seed layout should use stable non-database keys to connect the split files.
The keys exist only to keep the files deterministic and importable; actual
database rows continue to use Prisma-generated IDs.

The production import path should be a pure transform from the canonical split
files into the existing Prisma models. The small fixture remains a separate test
fixture so it can continue to support seed validation without polluting the
production seed surface.

## Related Code Files

- Create: `prisma/seed.ts`
- Create: `prisma/data/dictionary/en-vi/entries.json`
- Create: `prisma/data/dictionary/en-vi/senses.json`
- Create: `prisma/data/dictionary/en-vi/translations.json`
- Create: `prisma/data/dictionary/en-vi/aliases.json`
- Create: `prisma/data/dictionary/en-vi/fixtures/small-test.json`
- Create: `scripts/dictionary/normalize-dictionary.ts`
- Create: `scripts/dictionary/validate-dictionary.ts`
- Create: `scripts/dictionary/generate-seed-data.ts`
- Create: `scripts/dictionary/import-dictionary.ts`
- Delete: `prisma/seed-dictionary.ts`
- Delete: `scripts/dictionary/validate-seed.ts`
- Delete: `scripts/dictionary/generate-common-dataset.ts`
- Delete: `scripts/dictionary/generate-benchmark-dataset.ts`
- Delete: `prisma/data/dictionary/en-vi/common-1000.json`

## Implementation Steps

1. Define a stable key scheme for entries, senses, translations, and aliases.
2. Convert the current production dictionary dataset into the four normalized
   canonical files without changing the underlying content.
3. Move the small test fixture into `fixtures/small-test.json` and keep it
   isolated from the canonical production seed.
4. Rewrite the seed entrypoint and helper scripts to read the new layout and
   preserve deterministic, idempotent imports.
5. Update package scripts so generation, validation, normalization, and import
   all point at the new files.

## Success Criteria

- [ ] The canonical production seed is split across four files with stable
  cross-file keys.
- [ ] `fixtures/small-test.json` stays isolated from the production seed.
- [ ] The new seed entrypoint imports the normalized canonical files
  successfully.
- [ ] The seed remains deterministic and idempotent.
- [ ] No semantic dictionary changes are introduced during the move.

## Risk Assessment

The main risk is accidental semantic drift during normalization. That risk must
be handled by validation and by comparing row counts and representative lookup
results after import.
