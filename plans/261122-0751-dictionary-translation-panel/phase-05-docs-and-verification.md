---
phase: 5
title: "Docs and end-to-end verification"
status: completed
priority: P2
effort: "0.5d"
dependencies: [4]
---

# Phase 5: Docs and end-to-end verification

## Goal

Document the dictionary data and the new translation flow, measure dictionary
coverage, and run every check in the plan's acceptance criteria.

## Files to Create / Modify

- Modify: `README.md`:
  - the "Vocabulary capture" row;
  - a "Dictionary data" section with the import command, the production
    steps (`pg_dump` first) and the OVDP / Hồ Ngọc Đức credit and license;
  - an update to "Tests and checks" if it changed.
- Modify: `docs/Requirements/epic-04-vocabulary-capture.md` (read it first).
  Describe the Studio lookup, the Free/Pro split and saving from the panel.
- Create: `scripts/dictionary-coverage.ts`. It tokenizes the two
  `docs/Fixtures/upload-files/txt/valid-*.txt` files, resolves each distinct
  token of 3 or more letters with the phase 2 resolver logic, and prints
  the percentage and the misses.

## Tasks & Steps

1. Write and run the coverage script. Fix parser or lemmatizer gaps until
   coverage is at least 90%, or record why the remaining misses are
   acceptable (proper nouns, for example).
2. Update the README and the epic doc. Keep claims matched to the code. Link
   to `db/dictionary/SOURCE.txt` instead of copying it.
3. Walk through acceptance criteria 1 to 8 in `plan.md` and tick each one.
4. Run the full checks.

## Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `node --env-file-if-exists=.env scripts/dictionary-coverage.ts` prints 90%
  or more.
