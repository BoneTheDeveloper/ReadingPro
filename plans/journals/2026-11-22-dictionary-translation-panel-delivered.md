---
title: Dictionary translation panel delivered
date: 2026-11-22
summary: "OVDP dictionary import, word-lookup API, Studio Tra từ view and Pro inline popup; surface and base-form entries shown together"
---

# Dictionary translation panel delivered

## What happened
- Implemented plan `plans/261122-0751-dictionary-translation-panel` (all five phases).
- The OVDP source turned out to be StarDict (`en_vi.idx` + `en_vi.dict.dz` in `AnhViet.zip`), not plain text. Wrote a dependency-free zip/StarDict reader; the definition markup (`@ * - = !`) matched the plan. 116,905 single-word entries imported (multi-word headwords are 95% specialist terms; phrasal verbs live inside verb entries as `!` idioms).
- `running`, `saw`, `leaves` have their own entries, so "surface form first" broke acceptance criterion 2, while "lemma first" broke `interesting`/`bored`. After researching Yomitan and Oxford Learner's, the user chose to show both entries: the word's own entry first, then the base form marked "Dạng gốc".
- Added a client-side context match: the words right after the selection promote the matching idiom ("looks after" → "to look after", "Theo câu").
- `/api/translate` now requires a session and the Pro tier (`isProTier` in `src/shared/plan/tier.ts`).

## Problems found during verification
- Each lookup sent two POSTs in dev: the query passed its abort `signal`, and StrictMode's remount cancelled and re-sent it. The POST query no longer takes a signal.
- Replacing `StudioSlot` dropped its `key={contentKey}`, which would have let artifact-generation pending state leak across passages; the key now sits on `StudioPanel`.
- Docker socket is not accessible to the user account; Flyway V3 ran through `podman --network host` after a `pg_dump` backup in `~/readingpro-db-backups/`.
- `pnpm test` deletes every `@test.invalid` user, including the throwaway UI-check account, so the account has to be reseeded before each browser run.

## Decision
- Lookup results hold at most two entries (surface, then first existing verb/noun/adjective base form).
- The source zip is committed unchanged (13.2 MB) by user decision, so its sha256 matches upstream.

## Next steps
- Commit the branch `bone/feat/dictionary-translation-panel` when the user approves.
- Production: `pg_dump`, apply V3, then `pnpm db:import-dictionary` with `DATABASE_URL` set.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
