---
title: Inline Translation for Study Page
description: ''
status: completed
priority: P2
branch: main
tags:
  - study
  - translation
  - vocabulary
  - ai
blockedBy: []
blocks: []
created: '2026-05-29T02:08:41.549Z'
createdBy: 'ck:plan'
source: skill
---

# Inline Translation for Study Page

## Overview

Add a v1 English-to-Vietnamese inline translation flow to `/study`. Learners can select visible text in the reading content, see a lightweight contextual translation popup, open a detailed Translate view in the right Studio panel, and save selected vocabulary to a dedicated vocabulary store.

Implementation is complete. Phase 7 captures the design correction: quick translate does not call AI and uses contextual lookup, ranking, and deterministic fallback generation instead.

## Decisions

- V1 supports English source text to Vietnamese target translation only.
- V1 translates whichever content is currently visible in the Study reader: simplified text in simplified mode, original text in original mode.
- The quick popup appears after text selection and must not auto-open the full Studio panel.
- Translation uses the surrounding sentence or paragraph as context when available.
- V1 quick translation must not call AI. Quick mode resolves with exact cache first, contextual dictionary/provider lookup second, ranked candidates third, and deterministic fallback generation last.
- V1 detailed translation may call AI after a cache miss because it needs explanation, sentence translation, examples, and tutoring context that dictionary data cannot reliably provide.
- Saved words use a dedicated `VocabularyItem` model, not existing comprehension `Question`/`CardReview` rows.
- API responses follow this repo's standard `{ success: true, data }` / `{ error }` shape.
- Cache keys should be hashed from `userId`, `sourceId`, selected text, context sentence, target language, and mode to avoid oversized text indexes.
- Ask AI in v1 opens chat with a prepared/prefilled question; it must not automatically send a chat message.
- V1 stores translation history for cost/product analytics but does not add a history viewer.
- V1 does not include a custom right-click context menu.
- Every new API, dictionary/ranking/fallback, detailed AI, DB, and UI interaction must use the existing Sentry + Pino logging patterns in `docs/code-standards.md`.
- V1 includes a small seeded local dictionary and deterministic test passage so dictionary hit/miss/cache/fallback behavior is testable without an external dictionary service.

## Observability Requirements

- API routes must create request loggers with `createRequestLogger()` and `createRequestLogContext()`.
- Server modules must use Pino module loggers via `createModuleLogger()` where there is no request logger.
- Expected validation misses should log warnings without capturing exceptions.
- Unexpected errors must use `requestLog.error()` or `log.error()` and `Sentry.captureException()` with route/method or module operation tags.
- Expensive or important operations must use `Sentry.startSpan()`: auth, owned-source lookup, cache lookup, dictionary lookup, AI generation, cache write, history append, and vocabulary upsert.
- Client UI interactions must add Sentry breadcrumbs for selection captured, quick translation requested, details opened, vocabulary saved, and Ask AI opened.
- Logs and Sentry attributes must avoid raw selected text/context; record lengths, mode, source ID, target language, cache hit/miss, and result status instead.

## Issue Draft

Title:
`Add inline context-aware translation to Study page`

Body:
```md
## Goal
Add inline English-to-Vietnamese translation to `/study` so learners can select words or phrases while reading, get a quick contextual meaning, open a detailed translation panel, and save vocabulary.

## Requirements
- Show a quick translation popup on text selection inside reading content.
- Use surrounding sentence/paragraph as context.
- Support single-word, phrase, full-sentence, and double-click word selection.
- Add detailed Translate view in the right Studio panel.
- Keep reading flow uninterrupted; do not auto-open details.
- Store selected text and selection position immediately in client state.
- Add `POST /api/translate` with `quick` and `detailed` modes.
- Quick translate uses exact cache first, contextual dictionary/provider lookup second, ranked candidates third, and deterministic fallback generation last.
- Quick translate must not call AI; only detailed Translate may call AI after a cache miss.
- Cache translations by source, selected text, context sentence, target language, and mode.
- Add dedicated saved vocabulary persistence.
- Add Sentry spans/breadcrumbs and Pino logs for all new translation and vocabulary flows.
- Seed a small local dictionary and test passage covering dictionary hits, contextual terms, ranked lookup, cache hits, and deterministic fallback generation.

## Acceptance Criteria
- Selecting `algorithmic bias` shows a quick popup with Vietnamese translation.
- Selecting `bias` inside `algorithmic bias` uses context and avoids generic mistranslation.
- Unknown quick selections return a deterministic fallback result without calling AI.
- `Open details` switches Studio to the Translate panel.
- `Save` creates or reuses a vocabulary item.
- Repeating the same selection uses cached translation.
- API validates input, authenticates user, scopes passage access, and logs/Sentry-captures failures.
```

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Contracts and Data Model](./phase-01-contracts-and-data-model.md) | Completed |
| 2 | [Translation API and Persistence](./phase-02-translation-api-and-persistence.md) | Completed |
| 3 | [Study Page Selection UI](./phase-03-study-page-selection-ui.md) | Completed |
| 4 | [Translate Studio Panel](./phase-04-translate-studio-panel.md) | Completed |
| 5 | [Tests Docs and Verification](./phase-05-tests-docs-and-verification.md) | Completed |
| 6 | [Dictionary Page with Suggest Search](./phase-06-dictionary-page-suggest-search.md) | Completed |
| 7 | [Quick Translate Contextual Lookup Ranking and Fallback](./phase-07-quick-translate-contextual-lookup-ranking-fallback.md) | Completed |

## Dependencies

No active overlapping project-local plans were found during creation. The unrelated untracked directory `plans/finished_plan/playwright-auth-generated-screenshots/` is outside this plan and must not be modified.

## Review Gate

The original review gate has passed. Phase 7 should be reviewed before changing quick translate behavior because it intentionally removes AI from the quick path.

## Incoming Tasks After V1

- Add an optional right-click menu with Translate, Add to vocabulary, and Ask AI actions.
- Add a translation history UI in the Study panel or a future vocabulary dashboard.
- Add flashcard generation from saved `VocabularyItem` rows.
- Add user-selectable target languages beyond Vietnamese.
- Add pronunciation audio if the product needs spoken output instead of text-only pronunciation.
- Add vector storage/search for semantic vocabulary discovery, similar concepts across passages, and translation history recommendations.
- Add a richer `DictionarySense` model so one dictionary term can have multiple parts of speech and multiple meanings per part of speech. Quick lookup should rank senses by context instead of relying on one primary `DictionaryEntry.translation`.
