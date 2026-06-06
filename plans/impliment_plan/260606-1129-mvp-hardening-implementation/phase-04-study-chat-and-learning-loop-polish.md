---
phase: 4
title: "Study Chat and Learning Loop Polish"
status: pending
priority: P2
effort: "2-3d"
dependencies: [2]
---

# Phase 4: Study Chat and Learning Loop Polish

## Overview

Harden study chat states and close the MVP learning loop around saved vocabulary and review behavior. This phase keeps study chat grounded in original passage content and does not introduce mode switching.

## Requirements

- Functional: study chat handles history loading, empty states, streaming, stop, retry, invalid responses, auth failures, and persistence failures predictably; saved vocabulary has a documented MVP review path.
- Non-functional: chat remains passage-grounded, prompt-injection defensive, bounded by message/content limits, and tested at route and component levels.

## Architecture

`StudyChatPanel` uses AI SDK `useChat` with `DefaultChatTransport`, loads history from `GET /api/study-chat`, and sends messages to `POST /api/study-chat`. The route persists user and assistant messages in `StudyChatMessage`. Saved vocabulary is written through `POST /api/vocabulary` into `VocabularyItem`; card review currently uses `Question` and `CardReview`.

## Related Code Files

- Modify: `src/app/api/study-chat/route.ts`
- Modify: `src/features/study/study-chat-panel.tsx`
- Modify: `src/features/study/study-right-panel.tsx`
- Modify: `src/lib/study/shared/study-response-schema.ts`
- Modify: `src/app/api/vocabulary/route.ts`
- Modify: `src/lib/db/translation-queries.ts`
- Modify: `src/lib/db/card-review-queries.ts`
- Modify: `src/app/api/cards/due/route.ts`
- Modify: `src/app/api/cards/review/route.ts`
- Modify: `src/features/progress/progress-dashboard.tsx`
- Modify: `tests/vitest/integration/components/study/study-chat-panel.integration.test.tsx`
- Create: `tests/vitest/integration/api/study-chat-route.test.ts`
- Create: `tests/vitest/integration/api/vocabulary-learning-loop.test.ts`
- Modify: `docs/API/Routes/study-chat-feature.md`
- Modify: `docs/API/Routes/vocabulary-feature.md`
- Modify: `docs/Flows/study-chat-flow.md`
- Modify: `docs/Flows/spaced-repetition-flow.md`
- Create: `docs/ADR/0005-vocabulary-review-mvp-path.md`

## Implementation Steps

1. Add route tests for study chat POST and GET before changing behavior: invalid JSON, missing passage id, unauthenticated, missing owned passage, message limits, and history response shape.
2. Add component tests for history loading, schema failure, fetch failure, streaming indicator, stop, retry, and passage switch behavior.
3. Normalize chat GET ownership behavior if needed so history cannot imply access to another user's passage.
4. Preserve original-content-only chat behavior and document that simplified-content mode switching remains deferred.
5. Write a short ADR for saved vocabulary review: either keep vocabulary as saved lookup history for MVP, or map selected vocabulary into review cards through an explicit Question/CardReview path.
6. Implement the chosen MVP path only; avoid schema churn unless the ADR requires it.
7. Update chat, vocabulary, and spaced-repetition docs to match the implemented behavior.

## Success Criteria

- [ ] Study chat route tests cover validation, auth, ownership, history, stream setup, and persistence failures.
- [ ] Study chat component tests cover load, empty, error, streaming, stop, retry, and passage-switch states.
- [ ] Chat remains original-passage grounded and message/content limits are preserved.
- [ ] Vocabulary review behavior is documented in an ADR and implemented only to the agreed MVP depth.
- [ ] `pnpm run test` passes for study chat, vocabulary, cards, and progress-related suites.

## Risk Assessment

Risk: streaming test mocks can become brittle against AI SDK internals. Mitigation: test route validation and transport setup separately from AI SDK token streaming details.

Risk: vocabulary-to-review integration can grow into a schema redesign. Mitigation: force the ADR before implementation and keep the MVP path narrow.
