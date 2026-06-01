---
phase: 5
title: "Tests Docs and Verification"
status: pending
priority: P1
effort: "2h"
dependencies:
  - 1
  - 2
  - 3
  - 4
---

# Phase 5: Tests Docs and Verification

## Overview

Add focused regression coverage and docs for the dictionary schema, seed validation, runtime APIs, UI behavior, and source-label mapping.

## Requirements

- Functional: Tests cover normalization, seed validation, primary translation uniqueness, source-label mapping, exact/alias/phrase lookup, status filtering, short suggest queries, quick cache hit, stale UI responses, and duplicate-query cache reuse.
- Functional: Docs describe destructive dictionary replacement, DTO contracts, source provenance, local-only runtime boundary, and verification commands.
- Non-functional: Use existing Vitest, Testing Library, typecheck, lint, and Prisma generate patterns.

## Architecture

Keep seed validation tests DB-free. Keep API tests focused on response envelopes and DTOs. Keep UI tests focused on visible behavior and stale-response protection.

## Related Code Files

- Create: `/home/luc/Project/english-reading-training-app/src/lib/dictionary/normalize-dictionary-term.test.ts`
- Create: `/home/luc/Project/english-reading-training-app/src/lib/dictionary/resolve-dictionary-lookup.test.ts`
- Modify: `/home/luc/Project/english-reading-training-app/src/lib/dictionary/resolve-quick-dictionary-translation.test.ts`
- Create/Modify: `/home/luc/Project/english-reading-training-app/__tests__/api/dictionary-routes.test.ts`
- Create: `/home/luc/Project/english-reading-training-app/scripts/dictionary/validate-seed.test.ts`
- Create: `/home/luc/Project/english-reading-training-app/__tests__/components/dictionary/dictionary-page-client.integration.test.tsx`
- Modify: `/home/luc/Project/english-reading-training-app/docs/database/data-dictionary.md`
- Modify: `/home/luc/Project/english-reading-training-app/docs/API/translation-flow.md`

## Implementation Steps

1. Add seed validation tests for invalid `sourceType`, missing rank, zero primary translation, and multiple primary translations for one `senseId + targetLanguage`.
2. Add API/DTO tests for source provenance and backend-generated `sourceLabel`.
3. Add lookup and quick translate tests for exact, alias, phrase, multi-sense, status filtering, cache hit, and deterministic miss.
4. Add suggest/UI tests for normalized query length `< 2`, ranking, stale responses, clear behavior, and session cache.
5. Update docs and run focused tests, `pnpm run typecheck`, and `pnpm run lint`.

## Success Criteria

- [ ] Seed validation rejects bad provenance and primary translation violations.
- [ ] API tests verify DTO envelopes, source labels, lookup behavior, and status filtering.
- [ ] Suggest tests verify `< 2` behavior and deterministic ranking.
- [ ] Dictionary page component tests pass.
- [ ] `pnpm run typecheck` and `pnpm run lint` pass.

## Risk Assessment

The main risk is brittle tests that assert internals. Prefer public payloads, visible UI behavior, and validation failures.
