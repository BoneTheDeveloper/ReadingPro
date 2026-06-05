---
plan: 260604-1045-issue-46-legacy-input-runtime-fixes
status: completed
date: 2026-06-05
---

# Issue 46 Part 1 — Legacy Input Runtime Fixes: Completed

## Summary

All 4 phases completed. Phases 1 (UUID schema) and 3 (boundary validation) were delivered by the blocking Clerk/Neon migration (PR #74). Phases 2 (regression contracts) and 4 (verification/docs) verified as already aligned during this session.

## Changes Made This Session

- Updated `generatedQuestionsFixture[0].id` from `"question_test_1"` to UUID format in `tests/vitest/fixtures/article.ts`

## Verification Results

| Gate | Result |
|------|--------|
| Focused regressions (68 tests) | Passed |
| Full Vitest suite (267 tests) | Passed |
| Typecheck | Passed |
| Lint | Passed |
| Docs alignment | Verified — no updates needed |

## Phase Completion Detail

| Phase | Delivered By | Verified |
|-------|-------------|----------|
| 1. UUID Schema Normalization | Clerk/Neon migration (PR #74) | Schema uses `@db.Uuid` + `gen_random_uuid()` for all app-owned PKs/FKs |
| 2. Regression Contracts | Clerk/Neon migration + this session | Mode-less contract, legacy mode rejection, no-second-request, UUID boundary, malformed JSON — all tested |
| 3. Boundary Validation | Clerk/Neon migration | Strict Zod schemas, JSON parse → 400, UUID validation, `instanceof File` check |
| 4. Verification & Docs | This session | 267/267 tests pass, typecheck/lint green, docs already aligned |

## Residual Notes

- `translation-queries.ts` still hardcodes `mode: "quick"` for internal cache/history writes — correct per plan (legacy DB mode columns unchanged, Part 1 scope)
- Plan blocks `260604-1102-issue-46-output-boundary-migration` (Part 2) — now unblocked
