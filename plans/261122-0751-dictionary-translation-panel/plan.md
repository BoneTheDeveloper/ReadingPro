---
title: "Dictionary translation panel in Studio, inline translation for Pro"
description: "Move word translation into a Studio view backed by an imported English-Vietnamese dictionary, record each lookup as a Studio row, open external translators in popups, save words from the panel, and make the in-place popup plus AI context meaning Pro-only."
status: completed
priority: P1
effort: 4d
branch: bone/feat/dictionary-translation-panel
tags: [feature, frontend, backend, database, api]
blockedBy: []
blocks: []
created: 2026-11-22
---

# Dictionary translation panel in Studio, inline translation for Pro

## Overview

Today a selected word opens a floating popup that calls `/api/translate`
(gpt-4o-mini) and shows one meaning. This plan replaces that with a
LingQ-style flow:

1. The user selects a word, and the small popup still offers **Dịch**.
2. For a Free user, **Dịch** opens a **Tra từ** view in the right Studio column.
   The view shows the common meanings from an imported dictionary (no AI
   call), buttons that open external translators in a popup window, and a
   save form that writes to the vocabulary list.
3. Every lookup that finds a meaning becomes a row in the Studio list for that
   passage (the **Từ đã tra** section, shown next to the artifacts). It is
   stored in the database, so it survives a reload and can be deleted.
4. A Pro user gets the old in-place popup: dictionary meanings, the AI
   meaning in the context of the sentence, a quick save, and **Xem chi tiết**,
   which opens the Studio view. Only Pro may call `/api/translate`.

This plan runs before the billing plan. Pro is read from the existing
`"User"."tier"` session field through one shared helper. The billing plan
later swaps the source of that helper.

Context and decisions:
[brainstorm report](../reports/brainstorm-261122-1433-sepay-pro-tier-billing.md).

## Contract

- **Outcome:**
  - Free and Pro users can look up any selected word in the Studio **Tra từ**
    view. The view shows the headword, phonetic, meanings grouped by part of
    speech with the common ones first, and examples.
  - External translators open in a popup window: Google Dịch for the word,
    Google Dịch for the sentence, Cambridge English–Vietnamese, Oxford
    Learner's and DeepL.
  - A chosen or typed meaning can be saved to the vocabulary list.
  - Each successful lookup is stored as one row per word per passage, listed
    in Studio, can be reopened, and can be deleted.
  - Only Pro users get the in-place popup and the AI context meaning.
- **Constraints:**
  - The meanings come from the Hồ Ngọc Đức / OVDP English-Vietnamese
    dictionary, imported into Postgres. A lookup makes no AI call.
  - SQL stays in `*-repository.ts`. The schema change is a new Flyway
    migration (`V3__...`); `V1` and `V2` are never edited.
  - Back up the local database before running the migration. Production
    needs a `pg_dump` before both the migration and the import.
  - Client and server meet only in `src/shared`, and other modules import a
    module only through its `index.ts`. Both rules are enforced by eslint.
  - The server sends error reasons, never user-facing text. Client copy is
    Vietnamese.
  - Saving keeps using `POST /api/vocabulary` and its existing upsert
    (`savedCount` +1 on a repeat save).
  - The dataset license (GPL) is verified, and the source is credited in the
    README.
- **Non-goals:**
  - Highlighting saved words in the passage.
  - Click-to-select word tokens. Selection stays text selection.
  - Usage quotas, billing and checkout (billing plan).
  - A mobile layout for the three-panel workspace.
  - Audio pronunciation.
  - A server-side cache of AI translations.
  - Community meanings from other users.
- **Acceptance criteria:**
  1. `GET`/`POST /api/word-lookup*` and `/api/translate` return 401 without
     a session. `/api/translate` returns 403 `plan.pro_required` for a FREE
     user.
  2. Looking up `went` or `studies` returns the `go` or `study` entry marked
     as the base form. Looking up `running` returns the `running` entry first
     and the `run` entry second, marked as the base form. An unknown token
     returns 404 `dictionary.not_found` and creates no row.
  3. Looking up the same word twice in one passage leaves one row, moved to
     the top. The row disappears when the passage is deleted (cascade).
  4. Across `docs/Fixtures/upload-files/txt/valid-a1-simple.txt` and
     `valid-c1-complex.txt`, at least 90% of distinct alphabetic tokens of
     length 3 or more resolve to an entry. A coverage script prints the
     figure.
  5. A FREE user who selects a word and presses **Dịch** sees the Studio
     **Tra từ** view open (the right panel expands if collapsed), and a
     **Từ đã tra** row appears. No `/api/translate` request is sent.
  6. A PRO user sees the in-place popup with dictionary meanings and the AI
     context meaning. **Xem chi tiết** opens the same Studio view.
  7. Saving from the view adds the word to `/vocabulary` with the chosen
     meaning, its part of speech, the context sentence and the passage.
  8. `pnpm test`, `pnpm typecheck` and `pnpm lint` are green.

## Phases

| # | Phase | Status | Depends on |
|---|-------|--------|-----------|
| 1 | [Dictionary data: schema, parser, import](./phase-01-dictionary-data-import.md) | Completed | none |
| 2 | [Server: dictionary lookup, word-lookup API, Pro gate](./phase-02-lookup-api-and-pro-gate.md) | Completed | 1 |
| 3 | [Studio: Tra từ tile, lookup rows, detail view](./phase-03-studio-lookup-view.md) | Completed | 2 |
| 4 | [Reading flow: route selection to Studio, Pro inline popup](./phase-04-reading-flow-and-pro-inline.md) | Completed | 3 |
| 5 | [Docs and end-to-end verification](./phase-05-docs-and-verification.md) | Completed | 4 |

## Verification (2026-11-22)

All eight acceptance criteria were checked:
- Criteria 1 to 3: integration tests in `src/server/modules/{dictionary,word-lookup,translate}`,
  plus curl against the dev server (401 without a session).
- Criterion 4: `pnpm db:dictionary-coverage` reports 97.8% (misses: democratisation,
  lifecycle, pangram).
- Criteria 5 to 7: a headless Playwright run against the dev server with throwaway
  `@test.invalid` FREE and PRO accounts, and a database check of the saved word.
- Criterion 8: `pnpm test`, `pnpm typecheck`, `pnpm lint` and `pnpm build` are green.

Switching passages closes an open lookup view; this is covered by the Playwright suite
added afterwards (`pnpm test:e2e`, `e2e/dictionary-lookup.spec.ts`).

## Key decisions

- **Lemma resolution without AI, both entries shown.** The lowercased surface
  form and the `wink-lemmatizer` verb, noun and adjective forms are looked up
  in one `= ANY($1)` query. The result holds at most two entries: the surface
  entry when it exists, then the first existing base form (verb, then noun,
  then adjective) marked `match: "lemma"`. This follows Yomitan and Oxford
  Learner's: neither entry is hidden, so `interesting` keeps its own entry and
  `running` still shows `run`. Accepted by the user on 2026-11-22.
- **Lookup rows reference the headword, not the dictionary row**, through no
  foreign key. A reimport (`TRUNCATE` + insert) never breaks history. A
  missing entry falls back to showing external translators.
- **Studio view state moves up to `StudyWorkspace`** as
  `{ passageId, view }`. The view is derived as `null` when the passage
  changes. This lets the reading panel open the Studio view without an
  effect that syncs state.
- **One Pro helper:** `isProTier(tier)` in `src/shared/plan/tier.ts`. It
  replaces `PRO_TIER` in `src/shared/vocabulary/set-schema.ts`. The server
  guard and the client checks both use it.

## Risks

- **Dataset format or license differs from expectations.** Phase 1 starts
  with a check of the source file and its license, and stops if the license
  does not allow this use.
- **Some dictionary lines exceed the 200-character vocabulary translation
  limit.** Choosing a meaning fills an editable input that enforces the
  limit.
- **The session cookie cache (5 minutes) can delay a tier change.** This is
  acceptable until the billing plan replaces the tier source.
