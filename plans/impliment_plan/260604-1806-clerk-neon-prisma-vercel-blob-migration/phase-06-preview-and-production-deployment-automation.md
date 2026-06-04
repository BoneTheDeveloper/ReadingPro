---
phase: 6
title: "Preview and Production Deployment Automation"
status: pending
priority: P1
effort: "8h"
dependencies: [2, 3, 4, 5]
---

# Phase 6: Preview and Production Deployment Automation

## Overview

Automate isolated PR database branches and gated production migrations/deploys.
GitHub Actions owns the database-coupled preview and production deployment
lifecycle to avoid duplicate or incorrectly configured Vercel deployments.

## Context Links

- [Plan](./plan.md)
- [Current CI workflow](../../../.github/workflows/ci.yml)
- [Playwright config](../../../playwright.config.ts)
- [E2E auth setup](../../../tests/e2e/auth.setup.ts)
- [Neon preview workflow](https://neon.com/blog/branching-with-preview-environments)

## Requirements

- Functional:
  - PR open/sync/reopen creates or reuses `preview/pr-<number>`.
  - Preview migration applies using direct preview URL before deployment.
  - Preview app receives pooled preview URL only.
  - PR close deletes preview branch.
  - Production migration/deploy requires protected GitHub environment approval.
  - Local/Vercel Development remain on persistent approved branches.
- Non-functional:
  - Workflow retries are idempotent.
  - No preview can migrate production/development accidentally.
  - One workflow owns Vercel preview/production deployment.

## Architecture

```text
PR opened/synchronize/reopened
  -> create-or-get preview/pr-N from production
  -> verify branch target
  -> prisma migrate deploy using direct preview URL
  -> idempotent canonical dictionary seed
  -> vercel build/deploy preview with pooled preview URL
  -> run Clerk-authenticated smoke/E2E

PR closed
  -> delete preview/pr-N

main release
  -> GitHub production environment approval
  -> verify protected production target
  -> prisma migrate deploy with production direct URL
  -> approved canonical dictionary seed
  -> vercel build/deploy --prod with pooled production URL
```

Preview uses Clerk development and development Blob store. Webhook lifecycle
does not need one dynamic Clerk endpoint per preview because synchronous profile
bootstrap handles first use; preview branches are deleted with the PR.

## File Inventory

| Action | File | Change | Test impact |
|---|---|---|---|
| Create | `.github/workflows/preview-deploy.yml` | Preview branch create/migrate/deploy/test/delete lifecycle | Workflow dry run |
| Create | `.github/workflows/production-deploy.yml` | Approved migrate then production deploy | Workflow review |
| Modify | `.github/workflows/ci.yml` | Remove shared Supabase/E2E DB migration assumptions | CI |
| Create | `scripts/ci/verify-neon-branch.ts` | Fail if target branch differs from expected | Script unit/smoke |
| Modify | `tests/e2e/auth.setup.ts` | Clerk-compatible sign-in/setup | E2E |
| Modify | `tests/e2e/helpers/auth-state.ts` | Remove Supabase credential fallback | E2E/performance |
| Modify/delete | `tests/e2e/helpers/create-test-user.ts` | Clerk test-user lifecycle/helper | E2E setup |
| Modify | `playwright.config.ts`, `playwright.screenshot.config.ts` | Clerk testing setup/environment | E2E |
| Modify | `Makefile`, Docker E2E config | New auth/env contract | Local E2E |

## Workflow/Secret Checklist

- [ ] `NEON_PROJECT_ID`, scoped Neon API key, database role/user.
- [ ] `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- [ ] Clerk development keys/test credentials for preview E2E.
- [ ] Development Blob token for preview runtime.
- [ ] Protected production environment with Neon/Clerk/Blob production secrets.
- [ ] Preview runtime receives pooled DB URL, not direct migration URL.
- [ ] Production runtime receives pooled DB URL, not direct migration URL.
- [ ] Duplicate Vercel Git auto-deploy path disabled/ignored.

## Implementation Steps

1. Add branch-target verification script backed by Neon API/branch metadata.
2. Create idempotent preview workflow:
   - derive exact `preview/pr-${{ github.event.number }}`;
   - create if absent from `production`;
   - apply migrations with direct URL;
   - run idempotent canonical dictionary seed;
   - deploy Vercel preview with pooled URL;
   - run smoke/E2E;
   - comment deployment/branch result.
3. Add close-event cleanup that deletes only the exact expected preview branch.
4. Add gated production workflow: approval, target verification, migration,
   canonical seed, build, production deploy, post-deploy smoke.
5. Remove shared database migration from generic CI.
6. Convert Playwright auth helpers to Clerk-supported testing flow/test user.
7. Configure stable Clerk development webhook endpoint separately from previews.
8. Document rollback: stop deploy, restore/branch from Neon history, redeploy
   compatible app; never rewrite applied production migrations.

## Test Scenario Matrix

| Priority | Scenario | Expected |
|---|---|---|
| Critical | Preview migration URL points to production | Verification fails before Prisma |
| Critical | Production deploy without approval | Cannot migrate/deploy |
| Critical | PR close cleanup | Deletes exact preview branch only |
| Critical | Workflow rerun | Reuses branch/deployment safely |
| High | PR with new migration | Preview migrate succeeds before app deploy |
| High | PR without migration | Existing branch remains usable |
| High | Authenticated preview E2E | Clerk dev user signs in and owned workflows pass |
| High | Production post-deploy smoke fails | Workflow reports failure and invokes rollback runbook |

## Dependency Map

- Requires Phase 2 replayable baseline.
- Requires Phase 3 Clerk app flow and Phase 5 Blob env contract.
- Blocks final cleanup/verification in Phases 7-8.
- Coordinates but does not implement future schema-only/sanitized preview parent.

## Success Criteria

- [ ] Every PR deployment uses isolated `preview/pr-<number>`.
- [ ] Preview migrations run before preview deployment using direct URL only in job.
- [ ] Closed PR branches are deleted safely.
- [ ] Production migration/deploy requires approval and target verification.
- [ ] Generic CI no longer mutates a shared development/production database.
- [ ] Clerk-authenticated E2E runs against preview deployment.

## Risk Assessment

- Risk: Vercel auto-deploy races with orchestrated deploy.
  Mitigation: designate GitHub Actions as sole DB-coupled deploy owner.
- Risk: workflow deletes wrong Neon branch.
  Mitigation: exact expected-name check plus protected production branch.
- Risk: preview branch accumulates migration experiments.
  Mitigation: allow explicit reset/recreate action; never silently reset on sync.
- Risk: migrations succeed but app deploy fails.
  Mitigation: preview branch is disposable; production requires backward-compatible migrations and rollback runbook.

## Security Considerations

- Use GitHub environment protection and least-privilege secrets.
- Never print database URLs, Clerk secrets, Blob tokens, or Vercel tokens.
- Fork PRs must not receive privileged deployment secrets.
- Production branch protection is an additional control, not the only guard.
