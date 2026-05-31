---
title: "Translation MVP Dictionary Foundation"
description: "Implement issue #57: useful local EN-VI learner dictionary with richer flat entries, alias lookup, offline seed enrichment, cache-first quick translate, and stable local suggest search."
status: pending
priority: P1
effort: 14h
issue: 57
branch: main
tags: [feature, backend, frontend, database, api]
blockedBy: []
blocks: []
created: "2026-05-30T07:42:29.213Z"
createdBy: "ck:plan"
source: skill
---

# Translation MVP Dictionary Foundation

## Overview

Refactor this dictionary plan into the issue #57 MVP foundation. The implementation should make the dictionary useful for common learner lookups and the reading flow without pretending to build a full lexical dictionary. Use a richer flat `DictionaryEntry`, a small indexed `DictionaryAlias` table, versioned in-repo seed fixtures generated offline from safe public frequency data plus provider/manual enrichment, cache-first quick translate, and local deterministic suggest search.

## Current Baseline

- `DictionaryEntry`, `TranslationCache`, `TranslationHistory`, and `VocabularyItem` already exist in Prisma.
- `DictionaryEntry` is currently too thin for a useful dictionary page: one `translation` string, optional `type`, optional JSON metadata, no display term, no translation alternatives, no frequency rank, no review marker, and no indexed alias lookup.
- `prisma/seed-dictionary.ts` seeds a small test-file-derived dictionary, not the agreed 3k+ learner words/phrases.
- `/api/dictionary` does exact local lookup only; it does not resolve aliases or use reviewed local seed coverage beyond exact terms.
- `/api/dictionary/suggest` uses DB prefix search but lacks minimum query handling, exact-first ranking, and duplicate-query client cache.
- `/api/translate` already checks translation cache before quick/detailed resolution and has deterministic quick dictionary fallback coverage.
- `DictionaryPageClient` debounces suggest requests but can still apply stale responses and does not reuse identical-query suggestions.

## Scope

In scope:

- Dev-time schema migration that can overwrite the current dev dictionary shape.
- Shared dictionary query normalization: lowercase, trim, collapse whitespace, strip noisy surrounding punctuation.
- Richer flat `DictionaryEntry` fields for learner UX: `displayTerm`, `primaryTranslation`, `translations`, `shortDefinition`, optional `type`, optional `frequencyRank`, `source`, `confidence`, and `reviewed`.
- Indexed `DictionaryAlias` table for lookup behavior instead of JSON aliases. Aliases map common variants such as plural, past tense, manual variant, or phrase variant back to a canonical entry.
- Seed 3k learner words initially, with room to grow toward 10k, using deterministic `normalizedKey` values.
- Versioned in-repo seed fixtures generated offline from `wordfreq` / exported `wordfreq-en-25000` plus provider/manual enrichment, with strict licensing notes and review metadata.
- Cache-first quick translate behavior, with privacy-safe hashed translation cache keys.
- Local-only deterministic suggest endpoint with bounded fields, stable ordering, and DB-index-backed lookup.
- Client debounce, stale-response guard, clear-input guard, and small in-memory cache for repeated normalized suggest queries.
- Focused API, resolver, DB-query, seed-validation, and component tests.

Out of scope:

- Production lexical-quality ranking beyond exact/alias/prefix/phrase/frequency/confidence ordering.
- Full lemmatization or morphology engine.
- Broad plural/past-tense handling. MVP uses exact lookup, alias lookup, a few safe rules only, then fallback.
- Full `Lexeme`/`Sense`/`Example` relational dictionary model. MVP uses flat `translations[]` plus `shortDefinition`.
- Standards-grade CEFR tagging. MVP stores `frequencyRank` when available, not official CEFR.
- Runtime provider ingestion pipeline. Provider enrichment happens offline through scripts and reviewed fixtures.
- AI fallback for quick translate misses.
- Large external bilingual dictionary import unless license is unquestionably safe.
- Admin dictionary management UI. MVP edits seed JSON/CSV through PR review.

## Acceptance Criteria

- Local seed contains at least 3k common English learner words/phrases, including frequent short phrases, and can scale to 10k without schema change.
- Seed fixtures include source/license notes, normalized terms, primary translations, alternatives, optional definitions, optional frequency rank, confidence, and reviewed flags.
- Dictionary lookup order is exact `DictionaryEntry.normalizedTerm` -> exact `DictionaryAlias.normalizedAlias` -> safe tiny candidate rules -> deterministic fallback.
- Quick translate reads cache/local dictionary first and returns deterministic fallback without AI for misses.
- Translation cache keys are hashed; logs avoid raw selected text, raw context, and raw large query payloads.
- Suggest endpoint uses local DB only, returns 8-10 small DTOs, and has deterministic exact-first/alias/prefix/frequency/confidence ranking.
- Suggest query path uses normalized term indexes or an equivalent performant DB strategy.
- Dictionary search UI debounces requests, ignores stale responses, clears safely, and reuses identical-query suggestions during the session.
- Tests cover seed hit, alias hit, safe-rule fallback, deterministic fallback, cache hit, suggest ranking, empty/short query, stale-response guard, duplicate-query cache reuse, and seed fixture validation.
- Dictionary page miss copy is explicit: "No local dictionary result yet". Do not present deterministic fallback text as a confident meaning.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Data Model, Normalization, and Alias Lookup](./phase-01-data-model-normalization-and-seed-corpus.md) | Pending |
| 2 | [Offline Seed Generation and Review Fixtures](./phase-02-provider-enrichment-and-lookup-cache.md) | Pending |
| 3 | [Cache-First Quick Translate](./phase-03-cache-first-quick-translate.md) | Pending |
| 4 | [Stable Suggest API and Client Cache](./phase-04-stable-suggest-api-and-client-cache.md) | Pending |
| 5 | [Regression Tests Docs and Verification](./phase-05-regression-tests-docs-and-verification.md) | Pending |

## Dependencies

- Depends on existing inline translation schema from `prisma/migrations/20260529120000_add_inline_translation/migration.sql`.
- No cross-plan blocker detected in active project plans. Older related inline-translation plans are already moved under `plans/finished_plan/`.

## Approved MVP Decisions

| Decision | MVP Choice |
|----------|------------|
| Public frequency wordlist | Use `wordfreq` / exported `wordfreq-en-25000` as the first input corpus, after license verification before committing derived fixtures. |
| Draft translations | Generate offline through provider/manual workflow only. No runtime provider calls. Do not store provider output when source terms are unclear. |
| Draft definitions | Do not import Wiktionary directly into seed MVP. Write very short `shortDefinition` values for top reviewed words or leave optional. |
| Review threshold | Top 500 reviewed required; top 1000 reviewed preferred; all 3k not required before MVP. |
| Seed format | JSON is source of truth; generate CSV for manual review. |
| Variant rules | Use normalization plus `DictionaryAlias`; add only a few extremely safe candidate rules. |
| Fallback UX copy | Show "No local dictionary result yet"; do not pretend fallback text is a certain meaning. |

## Issue Source

- GitHub issue #57: "Translation MVP: seeded dictionary, provider fallback, and cache". This plan intentionally narrows provider fallback to offline seed enrichment for MVP.
