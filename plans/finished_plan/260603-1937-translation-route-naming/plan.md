---
title: "Translation Route Naming Clarification"
description: "Clarify translation API route naming so inline translation is not confused with dictionary search routes."
status: pending
priority: P2
effort: 2h
branch: "dictionary_search_flow_impliment"
tags: [docs, api]
blockedBy: []
blocks: []
created: "2026-06-03T12:37:29.213Z"
createdBy: "ck:plan"
source: skill
---

# Translation Route Naming Clarification

## Overview

Update `docs/API/Routes/translation-feature.md` so `POST /api/translate`
is documented as the inline translation route, not as a dictionary route. Keep
single-word/short-phrase translation and sentence/paragraph translation as two
internal runtime paths chosen by backend auto-detection.

Current implementation evidence:

- Public translation route: `src/app/api/translate/route.ts`
- Public dictionary routes:
  - `src/app/api/dictionary/suggest/route.ts`
  - `src/app/api/dictionary/search/route.ts`
  - `src/app/api/dictionary/lookup/route.ts`
  - `src/app/api/dictionary/entries/[entryId]/route.ts`
- Current implementation still accepts `mode: "quick" | "detailed"`, but the
  desired API contract removes `mode` and excludes detailed translation.
- Desired route behavior dispatches between lexicon-backed word lookup and
  non-AI machine translation automatically.

Decision:

- Do not split quick single-word translation and sentence/paragraph translation
  into separate public routes for this cleanup.
- Do not expose `mode` in the translation API contract.
- Remove detailed translation from the translation API docs; implementation can
  be aligned in later API work.
- Rename documentation concepts to route-vs-path language:
  - Route: `Inline Translation API` for `POST /api/translate`.
  - Quick path 1: `quick word lookup path`, for exact word/short phrase lookup
    through a translate-owned lexicon adapter.
  - Quick path 2: `quick machine translation path`, for sentence/paragraph text
    through the Google Translate-compatible provider.
  - Dictionary route family: `/api/dictionary/*`, for suggest/search/lookup/
    entry-detail only.
- Add split criteria for future work: split into routes only if the two quick
  paths need different request DTOs, auth/rate limits, cache models, caller
  ownership, response types, or independent API-level SLOs.
- Keep a future detailed translation feature possible, but do not model it as
  `mode` on `POST /api/translate`.
- Later implementation work should remove current translate `mode` handling.
- Keep the Google Translate-compatible implementation in the translation lib
  and map it to the quick machine translation path in API naming.
- Keep `provider: "dictionary"` understandable as a legacy/source label unless
  a later response-contract cleanup explicitly renames it.

This is a documentation/API contract clarification plan. It should not rename
route files or change runtime behavior.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Route Boundary Decision](./phase-01-route-boundary-decision.md) | Pending |
| 2 | [Translation API Documentation Update](./phase-02-translation-api-documentation-update.md) | Pending |
| 3 | [Verification](./phase-03-verification.md) | Pending |

## Dependencies

- No blocking unfinished project plans detected.
- Existing completed plan `plans/260603-1719-dictionary-raw-sql-query-grouping`
  preserves dictionary API contracts and does not block this docs cleanup.
- `docs/development-rules.md` was not present in this workspace; use
  `docs/code-standards.md` and `docs/API/Api-doc-convention.md` instead.

## Success Criteria

- `translation-feature.md` no longer uses endpoint naming that implies
  `/api/translate` is a dictionary route.
- `translation-feature.md` documents no client-selected `mode` and excludes
  detailed translation mode.
- Word/short-phrase and sentence/paragraph behavior are clearly documented as
  quick translation paths, not separate routes.
- `dictionary-feature.md` and `translation-feature.md` use consistent boundary
  language.
- The final docs answer the split question directly: keep one route now; split
  only when public contracts diverge.

## Out Of Scope

- Creating `/api/translate/word` or `/api/translate/sentence`.
- Renaming `src/app/api/translate/route.ts`.
- Changing cache/history/provider behavior.
- Changing dictionary route contracts.

## Later Implementation Decisions

- Remove `mode` from the translation API implementation and clients.
- Keep future detailed translation as a separate feature/route concept, not a
  `mode` on inline translation.
- Preserve the Google Translate-compatible provider in `lib/translation`, but
  expose it in API docs as the quick machine translation path.
- Clarify provider labels before changing them. Current `provider:
  "dictionary"` means lexicon/dictionary data source, not a dictionary HTTP
  route call.
