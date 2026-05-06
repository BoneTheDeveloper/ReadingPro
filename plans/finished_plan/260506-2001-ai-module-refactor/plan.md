---
title: "AI Module Refactor: Prompt Injection, Dead Code, Validation"
description: "Fix prompt injection (C2), eliminate dead AI module code (C3+H1), add schema constraints (H2+H4), make deleteMany+createMany atomic (H5), fix typing (M1+M2)"
status: pending
priority: P1
effort: 4h
branch: main
tags: [security, refactor, ai, validation]
created: 2026-05-06
---

## Architecture Decision: Option A (Use Module Functions)

**Why Option A over Option B:**
- Module functions (`detectCEFRLevel`, `simplifyContent`, `generateComprehensionQuestions`) already have proper system prompts, error handling, and logging
- Actions duplicate the same logic inline with WORSE prompts (no system prompts)
- Option A fixes C3 + H1 + C2 simultaneously in one move
- DRY: single place to maintain AI call logic
- Option B would delete good code and re-add it elsewhere -- wasteful

**Tradeoff:** Actions lose inline Sentry span wrapping around `generateObject`. Acceptable because:
- Module functions already log errors
- Sentry breadcrumbs added in actions before calling modules
- Can wrap module calls in Sentry spans from actions without duplicating generateObject

## Phases

| Phase | Description | Status | Effort |
|-------|-------------|--------|--------|
| [01](phase-01-prompt-injection-hardening.md) | Prompt injection hardening (XML delimiters + ignore-instructions) | pending | 1h |
| [02](phase-02-wire-actions-to-modules.md) | Wire actions to module functions, remove dead code | pending | 1.5h |
| [03](phase-03-schema-validation.md) | Schema validation: correctAnswer constraint, simplifiedText max, CEFRLevel type | pending | 0.5h |
| [04](phase-04-atomic-question-replace.md) | Make deleteMany+createMany atomic via transaction | pending | 0.5h |
| [05](phase-05-legacy-migration.md) | Migrate legacy analyzeContentAction + studyAnalyzeAction to use modules | pending | 0.5h |

## Dependency Graph

```
Phase 01 (prompt injection) ──┐
Phase 03 (schema validation) ─┤
Phase 04 (atomic replace) ────┼──> Phase 02 (wire actions) ──> Phase 05 (legacy migration)
```

- Phase 01 + 03 + 04 can run in parallel (different files)
- Phase 02 depends on all three (modifies both modules and actions)
- Phase 05 depends on Phase 02 (uses the same module functions)

## File Ownership Per Phase

| Phase | Files Modified | Files Created | Files Deleted |
|-------|---------------|---------------|---------------|
| 01 | `src/lib/ai/cefr-detector.ts`, `src/lib/ai/content-simplifier.ts`, `src/lib/ai/question-generator.ts` | none | none |
| 03 | `src/lib/ai/question-generator.ts`, `src/lib/ai/content-simplifier.ts`, `src/lib/ai/cefr-detector.ts` | none | none |
| 04 | `src/app/actions/study-generate-questions-action.ts` | none | none |
| 02 | `src/app/actions/study-upload-action.ts`, `src/app/actions/study-simplify-action.ts`, `src/app/actions/study-generate-questions-action.ts`, `src/lib/ai/cefr-detector.ts`, `src/lib/ai/content-simplifier.ts`, `src/lib/ai/question-generator.ts` | none | none |
| 05 | `src/app/actions/analyze.ts` | none | none |

**Conflict:** Phase 02 touches the same AI module files as 01/03. Must run AFTER 01/03.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Prompt injection fix changes AI output quality | Low | Medium | XML wrapping is non-destructive; test with real passages |
| Module function signatures don't match action needs | Low | High | Phase 02 adjusts signatures as needed |
| Transaction fails on SQLite | Very Low | Medium | Prisma interactive transactions work on SQLite |
| Legacy API routes break | Low | High | Phase 05 only changes internals, not API contract |

## Rollback Plan

Each phase is a self-contained commit. Revert any phase by `git revert` without cascading damage. No schema migrations involved.

## Success Criteria

- [ ] No user text appears unescaped in any AI prompt (grep for template literal injection)
- [ ] `detectCEFRLevel`, `simplifyContent`, `generateComprehensionQuestions` are called from actions
- [ ] No inline `generateObject` calls in action files (CEFR/simplify/questions)
- [ ] `correctAnswer` is validated against `options[].id`
- [ ] `simplifiedText` has `.max()` constraint
- [ ] `getHeuristicCEFR` returns `CEFRLevel` type
- [ ] `parsePassageLines` deleted
- [ ] Question replacement uses `$transaction`
- [ ] Legacy API routes (`/api/upload`, `/api/upload/text`) still work
- [ ] All existing tests pass
