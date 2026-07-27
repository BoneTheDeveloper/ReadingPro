---
title: "Phase 4: Verification, Manual Smoke, & Docs"
status: pending
priority: P2
effort: "0.5d"
dependencies: [phase-03]
---

# Phase 4: Verification, Manual Smoke, & Docs

## Overview

Verify the redesigned LLM-backed translate pipeline end-to-end and update the small set of docs that
the change touches. No attribution or provider label appears in the popup — that contract is checked
in the manual walk-through.

## Requirements

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm knip` all pass with the new DTO + provider modules.
- [ ] Manual Playwright walk-through confirms word + IPA + POS badge + translation are rendered, **and
  no provider label / attribution line is visible** in any state. Screenshot stored under
  `test-results/`.
- [ ] Provider smoke (curl) returns the bundle for at least three English words of varying morphology.
- [ ] `docs/reading/inline-translate.md` (or the project's inline-translate doc) is updated to link to
  the canonical DTO in `translation.ts` and to call out the `OPENAI_API_KEY` requirement.
- [ ] `.env.example` (or equivalent) lists `OPENAI_API_KEY=`.
- [ ] No new dead exports (`knip` clean) and no `node_modules` reads during implementation.

## Architecture

Verification follows the project's `pnpm typecheck / lint / knip` minimum, plus a focused manual flow.
The plan does not introduce a new test runner. If a regression appears, fix the cause instead of
weakening checks.

## Related Code Files

- Modify: `docs/reading/inline-translate.md` (if present — link to the canonical DTO; mention
  `OPENAI_API_KEY`)
- Modify: `.env.example` (or equivalent — add `OPENAI_API_KEY=`)
- Create: `test-results/inline-translation-bundle.png` (Playwright screenshot)
- Create: `plans/260727-1406-translate-api-redesign-from-ui-render/bundles.json` (smoke output)

## Implementation Steps

1. Run `pnpm typecheck`, `pnpm lint`, `pnpm knip` from the project root.
2. Boot the dev server with `OPENAI_API_KEY` set. In Playwright:
   - Navigate to a passage view.
   - Select a single word, click the inline language icon.
   - Confirm the popup shows word + IPA + POS badge + translation; assert no "Google Translate", no
     "Free Dictionary", no "OpenAI", no attribution text exists in the DOM (negative assertion).
3. Issue three `curl` calls against the running server with different words and dump the JSON to
   `bundles.json` for inspection.
4. Unset `OPENAI_API_KEY` and re-curl once; assert the route returns 502 `{ code: "upstream" }`.

## Success Criteria

- [ ] All three checks pass.
- [ ] Walk-through screenshot shows the four-piece render with no attribution line.
- [ ] All three smoke curls return non-empty `translation` and populated `partOfSpeech`.
- [ ] Missing-key curl returns 502 `{ code: "upstream" }`.

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| OpenAI latency in CI | Smoke is manual — runs against a local dev server, not CI. |
| Attribution line regresses from a future rebrand | Negative Playwright assertion makes the contract explicit. |
| `knip` flags `inline-translate.ts` deletion | Verify all importers updated; `grep` before commit. |
| `OPENAI_API_KEY` leaks into logs | Log keys are forbidden; the missing-key error message is generic. |
