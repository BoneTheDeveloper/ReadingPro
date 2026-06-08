---
phase: 1
title: Production Environment Verification
status: completed
priority: P1
effort: 1-2d
dependencies: []
---

# Phase 1: Production Environment Verification

## Overview

Define and verify the production environment boundary before changing user-facing behavior. This phase makes deploy configuration, runtime secrets, database migration access, storage access, and observability expectations explicit and testable.

## Requirements

- Functional: verify Clerk auth, Neon runtime and migration URLs, private Vercel Blob storage, Sentry DSN/source-map variables, Vercel build/runtime settings, and health/smoke routes.
- Non-functional: no production runtime should receive migration-only secrets; verification must be repeatable in preview and production; failures should produce actionable logs.

## Architecture

The app runs on Next.js with Clerk auth, Neon Postgres through Prisma, Vercel Blob storage, and Sentry. Runtime code must use `DATABASE_URL`; migration jobs may use `DIRECT_URL`. Storage selection is centralized in `src/lib/storage/blob-storage.ts`, while deploy readiness is documented under `docs/Operations/`.

## Related Code Files

- Modify: `docs/Operations/env-vars.md`
- Modify: `docs/Operations/deployment-runbook.md`
- Modify: `docs/Operations/production-migration-runbook.md`
- Modify: `docs/Operations/security-checklist.md`
- Modify: `.env.example`
- Modify: `vercel.json`
- Modify: `scripts/database/verify-direct-url-endpoint.mjs`
- Modify: `scripts/database/verify-production-deploy-config.mjs`
- Modify: `src/lib/storage/blob-storage.ts`
- Modify: `src/lib/core/sentry.ts`
- Modify: `sentry.server.config.ts`
- Modify: `sentry.edge.config.ts`
- Modify: `src/app/api/health/route.ts`
- Create: `tests/vitest/integration/api/health-and-env-contract.test.ts`

## Implementation Steps

1. Audit required and optional variables in `.env.example` against `docs/Operations/env-vars.md` and the actual code paths.
2. Update deployment and migration runbooks with explicit preview and production checklists.
3. Ensure `DIRECT_URL` is documented as migration-only and never needed by Next.js runtime.
4. Validate Blob environment behavior in `src/lib/storage/blob-storage.ts`, including local, preview, and production selection.
5. Confirm Sentry config degrades cleanly when optional DSN values are absent and CI-only source-map secrets are not runtime dependencies.
6. Add or update lightweight health/env contract tests that assert health response shape and no secret leakage.
7. Document manual smoke flow order: upload, study, translate, dictionary, chat, cards, progress.

## Success Criteria

- [ ] `.env.example` and operations docs match actual runtime usage.
- [ ] Preview and production verification steps are explicit enough for another engineer to run.
- [ ] Runtime never requires `DIRECT_URL`, Neon API tokens, or Vercel deployment tokens.
- [ ] Health route and Sentry/storage behavior are covered by targeted tests or documented smoke checks.
- [ ] Phase 5 release gate can reuse the checklist without additional discovery.

## Risk Assessment

Risk: environment docs can drift from code. Mitigation: keep checks close to scripts and include `.env.example` in the verification scope.

Risk: adding strict env validation can break local development. Mitigation: document required-by-environment behavior and keep local filesystem storage supported.
