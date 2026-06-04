---
phase: 1
title: "Contract Foundation and Translation Family"
status: pending
priority: P1
effort: "4h"
dependencies: []
---

# Phase 1: Contract Foundation and Translation Family

## Overview

Establish the shared response-contract pattern and migrate the critical
translation/vocabulary family first. Start only after Part 1 removes stale
translation mode callers and locks the mode-less behavior.

## Requirements

- Functional: translation success schema represents the single documented
  `{ translation, type, provider }` data shape.
- Functional: vocabulary success and shared error envelopes are runtime schemas.
- Functional: current study UI callers parse unknown JSON before state updates.
- Non-functional: optional performance payloads are represented explicitly.

## Architecture

Create shared API envelope primitives only when reused. Keep route-family data
schemas beside their domain:

```text
response.json(): unknown
  -> route-family response schema safeParse
  -> success data or controlled client error

route test response JSON: unknown
  -> same response schema parse
  -> complete contract assertion
```

Do not make a generic fetch client in this phase. A small parse helper is
acceptable only if translation and vocabulary demonstrate identical reuse.

## Related Code Files

- Create: `src/lib/api/shared/api-response-schema.ts`
- Create: `src/lib/translation/shared/translation-response-schema.ts`
- Create: `src/lib/translation/shared/vocabulary-response-schema.ts`
- Modify: `src/features/study/study-page-client.tsx`
- Modify: `src/features/study/study-translate-panel.tsx`
- Modify: `tests/vitest/integration/api/translation-vocabulary-routes.test.ts`
- Modify: `tests/vitest/helpers/api.ts`
- Review: `src/lib/ai/translator.ts`

## Implementation Steps

1. Inventory exact translation, vocabulary, error, and optional performance
   payloads after Part 1 lands.
2. Define shared error envelope and translation-family success schemas.
3. Infer exported response DTO types from schemas; remove duplicate frontend
   response-shape interfaces where the shared type is authoritative.
4. Parse translation/vocabulary browser responses from `unknown`; preserve
   loading/error/abort behavior on schema failure.
5. Add malformed-success-payload frontend tests.
6. Replace partial route payload checks with schema parsing and complete
   contract expectations.

## Regression Gate

```bash
pnpm exec vitest run tests/vitest/integration/api/translation-vocabulary-routes.test.ts tests/vitest/integration/components/study/study-page-client.integration.test.tsx
```

## Success Criteria

- [ ] Translation response schema accepts the documented simple result and
  rejects malformed success payloads.
- [ ] Translation/vocabulary clients validate JSON before use.
- [ ] Optional performance response shape is covered.
- [ ] Translation/vocabulary success and error responses have complete contract
  tests.
- [ ] No generic API client abstraction is added without demonstrated reuse.

## Risk Assessment

Overly strict schemas may reject intentional optional fields or serialized
dates. Model the actual wire format, including ISO date strings and documented
optional performance fields, then test representative payloads.

## Security Considerations

- Schema failure logging must not include selected text or context.
- Response parsing must not bypass existing auth/error handling.
