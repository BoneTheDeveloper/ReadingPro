---
phase: 3
title: "Boundary Validation Implementation"
status: pending
priority: P1
effort: "4h"
dependencies: [2]
---

# Phase 3: Boundary Validation Implementation

## Overview

Implement the mode-less translation contract cleanup and the smallest
route-local validation changes required to make Phase 2 regressions pass.
Preserve current success envelopes, ownership checks, and unexpected-failure
handling.

## Requirements

- Functional: valid mode-less translation requests execute the existing
  auto-detected runtime flow and return the documented simple data shape.
- Functional: legacy translation mode fields return `400`.
- Functional: opening the study translation panel does not issue another
  translation request.
- Functional: valid UUID passage IDs reach ownership lookup; malformed UUID
  identifiers are rejected before domain/database calls.
- Functional: malformed JSON and invalid body shapes return stable `400`.
- Functional: multipart upload rejects malformed form data and non-`File`
  entries with `400`.
- Non-functional: do not introduce response schemas; Part 2 owns outputs.

## Architecture

Translation flow:

```text
strict mode-less request -> authenticate
  -> existing executeTranslate cache-first flow
  -> backend classifies word/short phrase or sentence/paragraph input
  -> return { translation, type, provider }
```

Legacy JSON flow:

```text
request.json() parse -> malformed JSON 400
Zod safeParse(body) -> invalid shape/value 400
authenticate -> domain dependency -> success
unexpected dependency error -> log + Sentry + 500
```

Multipart flow:

```text
authenticate -> request.formData() parse -> malformed multipart 400
formData.get("file") instanceof File -> invalid/missing file 400
processFileUpload -> existing workflow mapping / unexpected 500
```

## Related Code Files

- Modify: `src/app/api/translate/route.ts`
- Modify: `src/features/study/study-page-client.tsx`
- Modify: `src/features/study/study-translate-panel.tsx`
- Modify: `src/features/study/study-types.ts`
- Modify: `src/lib/ai/translator.ts`
- Modify if needed: `localization/messages/en.json`
- Modify if needed: `localization/messages/vi.json`
- Modify: `src/lib/db/study-session-queries.ts`
- Modify: `src/app/api/study-session/route.ts`
- Modify: `src/app/api/cards/review/route.ts`
- Modify: `src/app/api/upload/text/route.ts`
- Modify: `src/app/api/upload/route.ts`
- Modify: `src/app/api/vocabulary/route.ts`
- Modify: `src/app/api/study-chat/route.ts`
- Modify: `src/app/api/dictionary/entries/[entryId]/route.ts`

## Refactor

- Make the translation request schema strict while keeping no `mode` field, so
  legacy mode input is rejected.
- Remove `mode` from the study translation request.
- Remove the detailed translation fetch and detailed-only rendering from the
  study translation panel; reuse the already-resolved simple translation.
- Remove confirmed-unused detailed translation types/schema/generator code.
- Preserve the existing cache-first service, backend input-shape detection,
  ownership checks, performance metrics, and simple success envelope.
- Do not change required legacy Prisma cache/history `mode` column semantics
  during the UUID migration.
- Keep UUID validation for passage IDs and align other persisted-record ID
  request schemas with the UUID database contract.
- Apply UUID request validation to persisted IDs: translation/vocabulary
  `sourceId`, study-chat/study-session `passageId`, study-session `sessionId`,
  card-review `cardReviewId`, and dictionary entry-detail `entryId`.
- Keep UI message IDs, result IDs, and question-option IDs as ordinary strings.
- Tighten study-session UUIDs and explicitly handle JSON parse failures.
- Add route-local card-review schema: UUID ID and integer rating `0-5`.
- Add route-local text-upload schema while preserving semantic length checks.
- Replace the upload `File` cast with explicit runtime narrowing.
- Do not capture expected parse/validation rejection in Sentry.

## Implementation Steps

1. Implement strict mode-less translation request parsing.
2. Remove stale mode fields and detailed translate behavior from study callers.
3. Remove confirmed-unused detailed translation code.
4. Align the listed persisted-record request schemas with UUID IDs and fix
   study-session route parsing.
5. Add card-review Zod request schema and parse handling.
6. Add text-upload Zod request schema and parse handling.
7. Harden multipart parsing and file narrowing.
8. Run focused tests and resolve only issue #46 regressions.

## Regression Gate

```bash
pnpm exec vitest run tests/vitest/integration/api/translation-vocabulary-routes.test.ts tests/vitest/integration/components/study/study-page-client.integration.test.tsx tests/vitest/integration/api/routes.test.ts src/lib/db/study-session-queries.test.ts src/lib/validation/upload.test.ts
```

## Success Criteria

- [ ] Valid study translation requests contain no mode.
- [ ] Legacy mode input returns `400`.
- [ ] Opening the study translation panel reuses the simple result and does not
  call `/api/translate`.
- [ ] No detailed AI translation path remains reachable from study translation.
- [ ] Valid UUID passage ID reaches ownership lookup and session creation.
- [ ] Malformed persisted-record UUIDs are rejected before domain/database
  calls.
- [ ] All new invalid/malformed request cases return `400`.
- [ ] Card-review rejects non-integer ratings and non-UUID IDs.
- [ ] File upload never passes a string value to `processFileUpload`.
- [ ] No generic request parsing helper or response schema is added.

## Risk Assessment

- Removing the detailed fetch changes the translation panel loading behavior.
  Preserve the existing simple result, Save vocabulary action, and Ask AI
  handoff without inventing replacement dictionary behavior.
- `instanceof File` differs across runtimes. Verify with current Web `File`
  helpers.
- Moving parse logic can change auth ordering. Preserve current route ordering.

## Security Considerations

- Reject untrusted shapes before domain/database calls.
- Preserve ownership checks and authenticated user scoping.
- Treat selected text/context as untrusted input throughout the existing
  translation resolver flow.
- Never log raw uploaded content, file bytes, selected text, or context.
