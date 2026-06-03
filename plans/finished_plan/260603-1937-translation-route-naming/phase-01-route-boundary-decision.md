---
phase: 1
title: "Route Boundary Decision"
status: pending
priority: P1
effort: "30m"
dependencies: []
---

# Phase 1: Route Boundary Decision

## Overview

Decide the public API boundary before editing route docs. The goal is to make
the docs clear without adding endpoints that the product does not need.

## Requirements

- Functional: answer whether quick single-word translation and sentence/
  paragraph translation should be separate public routes.
- Functional: define names that separate translation route behavior from
  dictionary route behavior.
- Non-functional: keep the decision simple, stable, and aligned with current
  code.

## Architecture

Current public route shape:

```http
POST /api/translate
GET /api/dictionary/suggest
GET /api/dictionary/search
GET /api/dictionary/lookup
GET /api/dictionary/entries/:entryId
```

Recommended naming:

| Thing | Name to use | Notes |
| --- | --- | --- |
| Public translation endpoint | `Inline Translation API` | `POST /api/translate` |
| Quick word branch | `quick word lookup path` | Lexicon-backed, translate-owned |
| Quick sentence branch | `quick machine translation path` | Google Translate-compatible provider |
| Public dictionary endpoints | `Dictionary API route family` | `/api/dictionary/*` only |

Recommendation: keep one public `POST /api/translate` route for quick word and
sentence translation. They share the same caller workflow, auth, source
ownership check, cache/history model, response envelope, and UI entry point.
Splitting now would duplicate route plumbing and move classification decisions
to clients without a clear payoff.

Split later only if one of these becomes true:

- Word and sentence paths need different request body contracts.
- They need different auth, quota, rate limiting, or audit policy.
- They need different cache/history persistence models.
- They need different response DTOs that cannot fit one stable response type.
- Separate clients call only one path and need independent API-level SLOs.
- Product wants callers to choose route semantics explicitly instead of
  selection classification.

## Related Code Files

- Modify: `docs/API/Routes/translation-feature.md`
- Review: `docs/API/Routes/dictionary-feature.md`
- Review: `docs/API/Api-doc-convention.md`
- Review: `src/app/api/translate/route.ts`
- Review: `src/app/api/dictionary/lookup/route.ts`

## Implementation Steps

1. Confirm the docs use `route` only for public HTTP endpoints.
2. Confirm `path` or `resolution path` is used for internal quick translation
   branches.
3. Document the split decision and future split criteria in
   `translation-feature.md`.
4. Keep all dictionary behavior named under `/api/dictionary/*`.

## Success Criteria

- [ ] Plan states one route now, two internal quick paths.
- [ ] Future split criteria are concrete enough for later API design.
- [ ] Dictionary lookup is not described as the same thing as quick word
  lookup.

## Risk Assessment

Risk: leaving the endpoint title as generic `Translate API` can still confuse
route and branch boundaries.

Mitigation: use `Inline Translation API` for the public endpoint and reserve
`word lookup path` / `machine translation path` for internal resolution.
