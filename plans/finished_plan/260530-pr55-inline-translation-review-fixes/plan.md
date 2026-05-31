---
title: "Manual Translate Trigger and Scope-Aware Quick Mode Fixes"
description: ""
status: pending
priority: P2
branch: "feat/inline-translation-study-ui"
tags: []
blockedBy: []
blocks: []
created: "2026-05-30T07:00:41.136Z"
createdBy: "ck:plan"
source: skill
---

# Manual Translate Trigger and Scope-Aware Quick Mode Fixes

## Overview

Change the Study inline translation UX so highlighting text only renders a floating translate icon, and the quick translation request runs only after the learner clicks that icon. Quick mode becomes scope-aware: one word or a short phrase uses the existing dictionary quick resolver; a sentence or paragraph uses the translation cache first, then a non-AI machine translation provider on cache miss, and stores the result in the existing translation cache/history. After the UX trigger change lands, address the PR #55 review threads that directly affect Study quick mode: popup positioning, dictionary seed deployment wiring, duplicate double-click selection, and punctuation-aware contextual phrase matching.

## Scope

In scope:

- Fix the PR #55 Codex review findings that directly affect Study quick mode while intentionally updating the quick-mode contract for sentence/paragraph selections.
- Change the selection UX so text highlight captures selection but does not auto-call `/api/translate`.
- Render a floating translate icon button near the selected text and trigger quick translation only on icon click.
- Update quick translation semantics: cache first for all quick requests; one word/short phrase selections resolve through dictionary/context ranking and deterministic fallback; sentence/paragraph selections call a non-AI translation provider on cache miss and then write cache/history.
- Add a small selection-scope classifier so quick mode can distinguish dictionary lookup from sentence/paragraph translation without changing the request payload.
- Add or wrap a non-AI translation provider, initially Google Translate-compatible, behind a server-side module so provider implementation details do not leak into the route.
- Render quick translation results without any Save-to-vocabulary action.
- Preserve detailed translation behavior unless the quick popup action surface changes.
- Add focused regression coverage for each bug class.
- Update docs for scope-aware quick mode, non-AI provider configuration, seed/deployment instructions, and API provider values.

Out of scope:

- No right-click translation menu.
- No translation history UI.
- No Save-to-vocabulary action in the quick translation popup.
- No `/api/vocabulary` changes or calls from this quick-mode implementation.
- No flashcard generation from saved vocabulary.
- No new target languages.
- No richer `DictionarySense` schema or semantic/vector search.
- No AI fallback in quick mode. Detailed translation may still use AI; quick sentence/paragraph translation must use only cache plus the configured non-AI provider.
- No provider fan-out, provider health dashboard, billing dashboard, or translation quality scoring in this plan.
- No Dictionary page suggest-search stale response fix in this plan. That is tracked separately because it affects `/dictionary`, not the Study quick translate flow.

## Acceptance Criteria

- Highlighting valid text in the Study reader renders a floating translate icon and does not call `/api/translate`.
- Clicking the translate icon sends exactly one quick `/api/translate` request for the current selection.
- Clicking the translate icon for a one-word or short-phrase selection uses the existing dictionary quick resolver after cache miss.
- Clicking the translate icon for a full sentence or paragraph checks the exact quick translation cache first; on cache miss it calls the non-AI translation provider and stores the provider result in cache/history.
- After quick translation succeeds, the popup renders the translated text and does not render a Save vocabulary action.
- Selecting near the bottom of the Study viewport renders the quick translation popup fully above the selected text and within viewport bounds.
- Fresh environments have an explicit documented command path to seed `dictionary_entries` after migrations.
- Double-clicking a word captures the final selection once and still does not call `/api/translate` until the translate icon is clicked.
- Selecting `bias` in context `algorithmic bias.` resolves the contextual phrase entry `algorithmic bias` instead of falling back to the generic single-word entry because of punctuation.
- Sentence/paragraph quick-mode tests prove no AI SDK call occurs and a repeated identical request returns provider `cache` without re-calling the non-AI provider.
- `pnpm run typecheck`, `pnpm run lint`, and focused Vitest coverage pass before finalize.

## Touchpoints

- `src/features/study/study-translation-popup.tsx`
- `src/features/study/study-page-client.tsx`
- `src/lib/db/translation-queries.ts`
- `src/features/study/study-content-panel.tsx`
- `src/lib/dictionary/resolve-quick-dictionary-translation.ts`
- `src/lib/translation/quick-selection-scope.ts`
- `src/lib/translation/non-ai-translation-provider.ts`
- `src/lib/ai/translator.ts`
- `prisma/seed-dictionary.ts`
- `package.json`
- `.env.example`
- `docs/API/translation-flow.md`
- Relevant tests under `__tests__/api`, `__tests__/components/study`, and `src/lib/dictionary`

## Decisions

- Prefer manual quick translation trigger over auto-trigger on selection. Selection capture is automatic; translation execution is explicit.
- Remove Save-to-vocabulary from the quick popup for this implementation. Vocabulary persistence is outside this plan.
- Keep AI out of the quick translation path for this plan. Detailed translation may continue using AI after cache miss, but quick mode must route short selections to dictionary/fallback and sentence/paragraph selections to a non-AI machine translation provider after cache miss.
- Preserve the existing `/api/translate` request shape. Scope selection should be inferred server-side from `text`, so the client does not need a new API field.
- Treat the initial non-AI provider as an implementation detail behind a small module. The route should depend on a generic quick sentence/paragraph translation function, not on provider-specific response parsing.
- Prefer extracting small pure helpers for popup positioning and selection dedupe only if they make regression tests simpler.
- Seed wiring should not run automatically during `next build`; production deploys should keep migration and seeding as explicit operational steps.
- Existing completed plan `plans/260529-inline-translation-study` is the functional baseline, but this plan intentionally updates the quick-mode contract for sentence/paragraph selections.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Manual Translate Trigger UX](./phase-01-manual-translate-trigger-ux.md) | Pending |
| 2 | [Review Feedback Triage](./phase-02-review-feedback-triage.md) | Pending |
| 3 | [Scope-Aware Quick Translation Correctness](./phase-03-core-translation-correctness.md) | Pending |
| 4 | [Study Quick UI Request Fixes](./phase-04-pr-ui-request-fixes.md) | Pending |
| 5 | [Seed Deployment Wiring](./phase-05-seed-deployment-wiring.md) | Pending |
| 6 | [Regression Tests and Verification](./phase-06-regression-tests-and-verification.md) | Pending |

## Dependencies

No active unfinished project plans overlap this work. The separate `plans/260530-dictionary-page-suggest-stale-response-fix` plan affects `/dictionary` suggest UI only and should remain independent. This plan follows the completed baseline plan at `plans/260529-inline-translation-study` and intentionally amends its quick-mode sentence/paragraph behavior.

## Review Sources

- PR: `https://github.com/BoneTheDeveloper/english-reading-training-app/pull/55`
- UX decision: highlight should reveal a translate icon; clicking the icon triggers quick translation.
- Product decision: short selections use the dictionary quick resolver; sentence/paragraph selections use cache-first non-AI machine translation.
- Codex review comments kept in this quick-mode plan:
  - `src/features/study/study-translation-popup.tsx`: flipped popup position
  - `prisma/seed-dictionary.ts`: seed wiring
  - `src/features/study/study-content-panel.tsx`: duplicate double-click lookup
  - `src/lib/dictionary/resolve-quick-dictionary-translation.ts`: punctuation-aware contextual phrase matching
- Moved to separate plan: `src/features/dictionary/dictionary-page-client.tsx` stale dictionary suggestions.
