---
title: "Vitest Test Infrastructure"
date: "2026-05-21"
source: "ck:cook"
plan: "plans/260521-issue-19-vitest-test-infrastructure/plan.md"
---

# Vitest Test Infrastructure

## Context

Issue 19 needed the app to move from no automated unit test runner to a usable Vitest baseline for Next.js, React, TypeScript, Prisma, Supabase, Sentry, and AI SDK code.

## What Happened

- Added Vitest, React Testing Library, jest-dom, jsdom, React plugin, and v8 coverage.
- Added package scripts for one-shot tests, watch mode, and coverage.
- Created shared setup that mocks external runtime boundaries before tests import production modules.
- Added domain fixtures and helpers for users, passages, questions, card reviews, study sessions, API requests, DB setup, and assertions.
- Added smoke tests proving alias resolution, jest-dom, DB reset behavior, deterministic AI output, and API request helpers.
- Added GitHub Actions CI so pull requests and pushes run lint, typecheck, tests, and coverage.
- Documented the testing scaffold and marked the implementation plan phases complete.

## Reflection

The main decision was to keep the mock layer broad but shallow. It gives future tests stable import boundaries without pretending to be a full in-memory Next or Prisma runtime.

## Decisions

- Keep smoke coverage small and infrastructure-focused.
- Mock live providers globally in Vitest setup.
- Ignore generated coverage output in both Git and ESLint.

## Next

- Add feature-level unit or route handler tests in follow-up issues.
- Expand DB mock model methods only when a real test needs them.
