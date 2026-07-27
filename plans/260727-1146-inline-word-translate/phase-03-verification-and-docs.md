---
phase: 3
title: "Verification and Docs"
status: pending
priority: P2
effort: "0.5d"
dependencies: [1, 2]
---

# Phase 3: Verification and Docs

## Overview

Verify the feature through the repository's required quality gates plus focused browser interaction. Reconcile `docs/Requirements/epic-04-vocabulary-capture.md`, whose US-12 currently claims phrase translation, cache, history, and implemented status even though the accepted delivery is a one-word prototype with no cache/history. The doc update must explicitly mark the prototype boundary rather than silently claiming the original epic is complete.

## Context Links

- `CLAUDE.md` — common checks and docs-impact rule.
- `docs/Requirements/epic-04-vocabulary-capture.md` — US-12 contract to reconcile.
- `docs/design.md` — popup design verification.
- Phase 1 and Phase 2 files in this plan.

## Requirements

### Functional

- Verify exact one-word selection, invalid selection, icon behaviour, popup placement, translation, retry, dismissal, and stale-response protection.
- Verify the popup only renders in passage mode and resets when passage/view changes.
- Verify accessibility: keyboard focus, Escape dismissal, button labels, loading state announcement, and `role` semantics.
- Verify the provider response never exposes raw upstream HTML or parsing errors.

### Non-Functional

- Required checks: `pnpm typecheck`, `pnpm lint`, `pnpm knip`.
- Browser validation uses Playwright against the running app. Store screenshots under `test-results/` per `CLAUDE.md`.
- Do not add Vitest, Jest, or Testing Library solely for this feature; the project has no test runner configured. If the project adds one before implementation, add pure-function coverage for the selection helper using that existing runner.
- Documentation changes only cover durable product behavior and known limitations.

## Architecture

Verification matrix:

| Scenario | Expected result | Gate |
|----------|-----------------|------|
| Select `gesture` | Icon appears below selection | Playwright |
| Selection near bottom edge | Popup flips above | Playwright + screenshot |
| Select `two words` | No icon | Playwright |
| Select punctuation only | No icon | Playwright |
| Select word outside passage | No icon | Playwright |
| Click icon | Loading then Vietnamese translation | Playwright / network |
| Upstream unavailable | Error message + retry | Playwright with route interception |
| New word while previous request slow | Only newest translation visible | Playwright with delayed response |
| Press Escape / outside click | Popup closes and state resets | Playwright |
| Switch passage / view | Popup closes; no stale UI on return | Playwright |
| Type safety / lint / dead code | Clean | pnpm commands |

## Related Code Files

- Modify: `docs/Requirements/epic-04-vocabulary-capture.md`
- No new test files by default; screenshots go to `test-results/inline-word-translate-*.png` (ignored output, not source).
- If a runner exists by implementation time:
  - Create: `src/features/reading/utils/selection-to-word-selection.test.ts`
  - Create: `src/features/reading/hooks/use-word-translation.test.ts`

## Implementation Steps

1. **Run narrow static gates first.**
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm knip`
   - Fix regressions; do not add ignores or weaken types to get green.
2. **Run the app and exercise the happy path.**
   - Start with `pnpm dev`.
   - Navigate to `/study`, open any passage, and select an English word.
   - Confirm icon, popup, loading → success, and `Google Translate` attribution.
   - Capture `test-results/inline-word-translate-success.png`.
3. **Exercise positioning and dismissal.**
   - Scroll the selection near the bottom of the reader panel and confirm `data-placement="top"` or visible top flip.
   - Capture `test-results/inline-word-translate-flipped.png`.
   - Press Escape and click outside; confirm hidden each time.
4. **Exercise invalid selections.**
   - Select two words, whitespace, punctuation, and a toolbar label. No icon may render.
5. **Exercise failure and race conditions.**
   - Intercept `/api/translate` to delay the first word, then select a second word. Resolve second first; only second may show.
   - Intercept with a 502; popup shows short error copy and retry button.
6. **Reconcile product docs.**
   - Update US-12 status from `Implemented` to a prototype marker such as `Partial` if that vocabulary exists; otherwise keep `Implemented` and add a prominent "Current prototype boundary" block.
   - Change the acceptance criteria to clearly separate shipped prototype behaviour (one word, on-demand, no persistence) from deferred full US-12 behaviour (phrase support, cache, history, ownership verification at data layer).
   - Do not change US-13/US-14/US-15.
7. **Final consistency check.**
   - Re-read `content-panel.tsx`, hook, service, route, schema, and US-12.
   - Confirm the final implementation exactly matches this plan's acceptance criteria.

## Success Criteria

- [ ] `pnpm typecheck` exits 0.
- [ ] `pnpm lint` exits 0.
- [ ] `pnpm knip` introduces no new findings.
- [ ] Playwright verifies all scenarios in the matrix.
- [ ] Screenshots live under `test-results/` only.
- [ ] US-12 documentation reflects one-word prototype scope and explicitly identifies cache/history/phrase translation as deferred.
- [ ] No unrelated docs or product requirements are changed.

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Unofficial Google Translate is unavailable in CI or local environment | Static gates remain deterministic; browser failure-path test validates graceful error. Happy-path provider smoke test may be marked blocked with exact upstream error, never silently passed. |
| Docs say "Implemented" while behavior is partial | Phase 3 adds an explicit prototype boundary; it does not claim full US-12 completion. |
| Browser test depends on auth state | Use the existing authenticated local session. If unavailable, stop with an auth blocker; do not bypass the route's auth gate. |
| Screenshot captures private passage content | Use seeded / fixture passage only; do not capture user-private data. |

## Rollback

- Revert the three source modifications and remove the two new source modules.
- Restore the placeholder hook and service bodies only if the provider feature is abandoned.
- Revert the US-12 prototype-boundary edit if the full requirement ships in the same release.
