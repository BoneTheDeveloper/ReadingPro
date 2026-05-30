---
phase: 2
title: "Review Feedback Triage"
status: pending
priority: P2
effort: "1h"
dependencies:
  - 1
---

# Phase 2: Review Feedback Triage

## Overview

Confirm the current code still matches the PR #55 review findings and lock the updated implementation boundaries before making changes.

## Main Info

- Problem: The plan now changes UX behavior and quick translation routing before fixing PR feedback, and only Study quick-mode PR feedback belongs here.
- Resolve: Re-fetch PR #55 threads, map quick-mode comments to the post-UX-trigger touchpoints, confirm the Dictionary page stale suggestion comment is handled by the separate plan, and mark the vocabulary-save comment as superseded by removing Save from the quick popup. Also confirm the new scope-aware quick-mode routing is treated as an intentional product update, not a PR review fix.

## Requirements

- Functional: Map each unresolved PR #55 comment to the local file, line, and expected behavioral fix.
- Functional: Confirm no review thread has already become outdated or resolved before implementation starts.
- Functional: Exclude `/dictionary` page suggest-search work from this quick-mode plan.
- Functional: Exclude `/api/vocabulary` and Save-to-vocabulary work from this quick-mode plan.
- Functional: Confirm short-selection dictionary behavior and sentence/paragraph non-AI provider behavior are part of the updated plan scope.
- Non-functional: Keep unrelated inline translation feature design out of scope.

## Architecture

This phase is an analysis checkpoint. It should use GitHub review threads and local code inspection to produce a compact implementation checklist, then proceed to code only after the checklist matches the plan acceptance criteria.

## Related Code Files

- Read: `src/features/study/study-translation-popup.tsx`
- Read: `src/features/study/study-page-client.tsx`
- Read: `src/features/study/study-content-panel.tsx`
- Read: `src/lib/dictionary/resolve-quick-dictionary-translation.ts`
- Read: `src/app/api/translate/route.ts`
- Read: `src/lib/ai/translator.ts`
- Read: `package.json`
- Read: `prisma/seed-dictionary.ts`

## Implementation Steps

1. Fetch PR #55 review threads and confirm the six Codex comments are still unresolved and not outdated.
2. Re-read each local touchpoint and verify the behavior described in the review comment still exists.
3. Identify the smallest code path that should own each fix:
   - Popup position belongs in `StudyTranslationPopup`.
   - Nullable vocabulary save feedback is not implemented here because Save is removed from the quick popup.
   - Double-click duplicate lookup belongs in `StudyContentPanel` selection handling.
   - Punctuation normalization belongs in quick dictionary candidate generation/ranking.
   - Scope-aware quick routing belongs in the API route plus small translation helper modules.
   - Seed wiring belongs in package scripts and docs.
4. Confirm the Dictionary page stale suggestion comment is tracked separately and not implemented in this plan.
5. Confirm the vocabulary save comment is superseded by removing Save from the quick popup and not touching `/api/vocabulary`.
6. Confirm the non-AI provider choice/configuration before implementation; if no stable provider endpoint is available, mark implementation blocked instead of silently falling back to AI.
7. Record any discovered drift before implementing; if a comment no longer applies, mark it as a no-op with evidence.

## Success Criteria

- [ ] Each PR comment has a confirmed local touchpoint.
- [ ] Non-quick `/dictionary` page suggest-search feedback is excluded from this plan.
- [ ] Save-to-vocabulary and `/api/vocabulary` changes are excluded from this plan.
- [ ] Scope-aware quick translation is explicitly confirmed as in scope.
- [ ] No unrelated feature work is added to the implementation scope.
- [ ] Acceptance criteria in `plan.md` remain valid after triage.

## Risk Assessment

Risk is low. The main risk is expanding into product enhancements beyond review feedback. Keep the phase limited to evidence gathering and scope confirmation.
