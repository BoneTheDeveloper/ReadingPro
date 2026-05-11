# Brainstorm: Remove CEFR AI Detection

**Date:** 2026-05-11
**Decision:** Remove AI CEFR detection, keep heuristic only

## Problem

CEFR AI call (`detectCEFRLevel`) costs tokens + latency on every upload. Returns 6 fields, only 1 used (`level`). Heuristic already exists as fallback and is good enough for the only decision CEFR drives: simplify or not.

## Current State

- `src/lib/ai/cefr-detector.ts` — AI call (`detectCEFRLevel`) + heuristic (`getHeuristicCEFR`)
- AI uses gpt-4o-mini, returns level + 5 unused sub-scores (confidence, vocabulary, grammar, sentence, reasoning)
- Heuristic uses avg sentence length + complex word ratio — free, instant
- Both called from: `analyze.ts`, `study-upload-action.ts`

## What CEFR Actually Drives

1. **Simplification gate** — A1/A2 skip, else simplify one level down
2. **UI badges** — "Original (B2)" / "Simplified (B1)" labels
3. Nothing else — no user-level tracking, no adaptive difficulty

## Decision

| Component | Action |
|-----------|--------|
| `detectCEFRLevel()` AI call | **Delete** |
| `getHeuristicCEFR()` | **Keep** — move to `src/lib/shared/cefr-utils.ts` |
| `cefr-utils.ts` (colors, labels) | **Keep** as-is |
| DB `originalLevel` / `simplifiedLevel` fields | **Keep** — heuristic result stored there |
| `src/lib/ai/cefr-detector.ts` | **Delete entire file** |

## Impact

- Upload flow: `analyze.ts` and `study-upload-action.ts` — replace AI call + fallback with direct heuristic call
- No UI changes — badges still work, heuristic provides the level
- No DB changes — same fields, heuristic result instead of AI result
- ~800 tokens saved per upload, ~200ms latency saved

## Rationale

Heuristic is right ~80% for the simplify/no-simplify binary decision. When wrong, consequence is simplifying to slightly wrong level — not user-facing catastrophe. Pre-MVP, free + instant beats marginal accuracy gain.
