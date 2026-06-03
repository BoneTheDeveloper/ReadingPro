---
phase: 2
title: "Translation API Documentation Update"
status: pending
priority: P1
effort: "1h"
dependencies: [1]
---

# Phase 2: Translation API Documentation Update

## Overview

Revise `docs/API/Routes/translation-feature.md` so the route contract and
feature boundaries match the desired API naming and the decision from Phase 1.

## Requirements

- Functional: rename the endpoint heading from generic/confusing wording to a
  route-specific name.
- Functional: clarify quick word lookup versus quick machine translation.
- Functional: explicitly exclude detailed translation mode and client-selected
  `mode`.
- Functional: preserve the API documentation convention's six-section endpoint
  shape.
- Non-functional: no runtime code changes.

## Architecture

Target doc structure:

```md
## Endpoints

### Inline Translation API

#### 1. Purpose
...
#### 2. Method + path

POST /api/translate
```

Request body should match current route schema:

```ts
{
  text: string;
  context: string;
  sourceId: string;
  sourceLanguage: "en";
  targetLanguage: "vi";
}
```

Route behavior language:

- Backend auto-detection:
  - single word / short phrase -> `quick word lookup path`
  - sentence / paragraph -> `quick machine translation path`
- Detailed translation:
  - excluded from docs and desired API contract
  - future feature can exist separately, but not as `mode` on inline translation
  - current implementation cleanup is deferred to later API work
- Google Translate-compatible provider:
  - keep implementation in translation lib
  - expose in route docs as `quick machine translation path`
- Dictionary:
  - `/api/dictionary/lookup` is exact typed dictionary lookup
  - it is not called as an internal HTTP dependency of `/api/translate`

## Related Code Files

- Modify: `docs/API/Routes/translation-feature.md`
- Optionally modify: `docs/API/Routes/dictionary-feature.md` only if a term
  mismatch remains after the translation doc edit.

## Implementation Steps

1. Rename endpoint heading to `Inline Translation API`.
2. Update purpose text:
   - owns inline selected-text translation
   - not dictionary suggest/search/detail
   - backend auto-detection has two internal runtime paths
3. Confirm request DTO does not include `mode`.
4. Update response notes to mention the single inline translation result shape.
5. Update server logic:
   - authenticate
   - cache lookup
   - verify source on cache miss
   - backend dispatches by selected text shape
   - cache and history persist after resolution
6. Replace any wording that calls the quick word path a dictionary route.
7. Add or update a `Should this be split?` note:
   - answer: no, not now
   - include split criteria from Phase 1
8. Re-read `dictionary-feature.md` and ensure boundary terms match.
9. Add future implementation notes so later API work removes `mode` without
   blocking a separate detailed translation feature.

## Success Criteria

- [ ] `POST /api/translate` is named as an inline translation route.
- [ ] The doc uses `quick word lookup path`, not `dictionary route`, for
  single-word quick translation.
- [ ] The doc uses `quick machine translation path` for sentence/paragraph
  quick translation.
- [ ] The request body does not include `mode`.
- [ ] Detailed translation mode is explicitly out of scope.
- [ ] Any AI/no-AI statement says inline translation must not call AI.
- [ ] Dictionary docs remain consistent and do not require contract changes.

## Risk Assessment

Risk: docs may define the desired API before implementation fully matches it.

Mitigation: keep implementation cleanup listed as later API work and do not
claim runtime code was changed by this docs phase.
