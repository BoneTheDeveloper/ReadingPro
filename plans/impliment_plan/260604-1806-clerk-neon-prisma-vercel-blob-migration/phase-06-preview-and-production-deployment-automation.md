---
phase: 6
title: "Preview and Production Deployment Automation"
status: pending
priority: P1
effort: "10h"
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
- [Neon GitHub Actions](https://neon.com/docs/guides/branching-github-actions)
- [Vercel GitHub Actions deployments](https://vercel.com/docs/deployments/git/vercel-for-github)
- [Vercel Git deployment configuration](https://vercel.com/docs/project-configuration/git-configuration)
- [GitHub Actions secrets](https://docs.github.com/en/actions/how-tos/security-for-github-actions/security-guides/using-secrets-in-github-actions)

## Requirements

- Functional:
  - Trusted same-repository PR open/sync/reopen creates or reuses `preview/pr-<number>`.
  - Preview migration applies using direct preview URL before deployment.
  - Preview app receives pooled preview URL only.
  - PR close deletes preview branch.
  - Production migration/deploy requires protected GitHub environment approval.
  - Local/Vercel Development remain on persistent approved branches.
  - Fork and Dependabot PRs run secretless CI only.
  - Expired Blob upload intents are cleaned on a bounded schedule.
- Non-functional:
  - Workflow retries are idempotent.
  - No preview can migrate production/development accidentally.
  - One workflow owns Vercel preview/production deployment.
  - Workflow permissions, action versions, concurrency, and secret release are explicit.

## Architecture

```text
Trusted same-repository PR opened/synchronize/reopened
  -> protected preview environment/actor gate
  -> create-or-get preview/pr-N from production
  -> verify branch ID, name, and parent ID
  -> prisma migrate deploy using direct preview URL
  -> idempotent canonical dictionary seed
  -> Vercel preview deploy with pooled preview URL
  -> run Clerk-authenticated smoke/E2E

Fork/Dependabot PR
  -> secretless CI only; no provider credentials

PR closed (base-owned minimal cleanup workflow; no PR checkout/code)
  -> delete preview/pr-N

manual production release from approved main SHA
  -> GitHub production environment approval
  -> verify protected production branch ID/name
  -> prisma migrate deploy with production direct URL
  -> approved canonical dictionary seed
  -> stage production deployment without assigning production domain
  -> smoke staged deployment
  -> explicitly promote staged deployment

scheduled cleanup
  -> call CRON_SECRET-protected expired-upload cleanup route
```

Preview uses Clerk development and development Blob store. Webhook lifecycle
does not need one dynamic Clerk endpoint per preview because synchronous profile
bootstrap handles first use; preview branches are deleted with the PR.

## File Inventory

| Action | File | Change | Test impact |
|---|---|---|---|
| Create | `.github/workflows/preview-deploy.yml` | Trusted preview branch create/migrate/deploy/test lifecycle | Workflow dry run |
| Create | `.github/workflows/preview-cleanup.yml` | Minimal base-owned close-event branch deletion; no PR checkout | Workflow review |
| Create | `.github/workflows/production-deploy.yml` | Approved migrate, staged deploy, smoke, promote | Workflow review |
| Modify | `.github/workflows/ci.yml` | Remove shared Supabase/E2E DB migration assumptions | CI |
| Create | `vercel.json` | Disable Vercel Git auto-deploy; schedule expired-upload cleanup | Config review |
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
- [ ] Protected preview environment/actor policy for privileged same-repo deploys.
- [ ] Preview runtime receives pooled DB URL, not direct migration URL.
- [ ] Production runtime receives pooled DB URL, not direct migration URL.
- [ ] Vercel Git auto-deploy disabled with `git.deploymentEnabled: false`.
- [ ] Fork/Dependabot PR jobs cannot access provider secrets.
- [ ] Third-party actions pinned to reviewed immutable commit SHAs.
- [ ] Per-PR and production concurrency groups prevent overlapping destructive work.

## Implementation Steps

1. Add branch-target verification script backed by Neon API branch ID/name/parent
   metadata; never infer safety from a connection-string label.
2. Add `vercel.json` to disable Vercel Git auto-deployment and schedule the
   bounded expired-upload cleanup route.
3. Create idempotent privileged preview workflow for trusted same-repository PRs:
   - reject forks and Dependabot before any secret-bearing job;
   - require protected preview environment/actor policy;
   - derive exact `preview/pr-${{ github.event.number }}`;
   - create if absent from `production`;
   - verify branch ID/name/parent before applying migrations with direct URL;
   - run idempotent canonical dictionary seed;
   - deploy Vercel preview with pooled URL;
   - run smoke/E2E;
   - comment deployment/branch result.
4. Add separate base-owned close-event cleanup that never checks out or executes
   PR code and deletes only the exact expected preview branch.
5. Add gated manual production workflow for an approved main SHA: approval,
   target verification, migration, canonical seed, staged production deployment,
   staged smoke, then explicit promotion.
6. Add least-privilege workflow permissions, immutable action pins, per-PR
   concurrency with cancellation, and production concurrency without cancellation.
7. Remove shared database migration from generic CI; keep fork/Dependabot CI secretless.
8. Convert Playwright auth helpers to `@clerk/testing` supported testing-token/sign-in flow.
9. Configure stable Clerk development webhook endpoint separately from previews.
10. Document rollback: stop promotion, restore/branch from Neon history, redeploy
   compatible app; never rewrite applied production migrations.

## Test Scenario Matrix

| Priority | Scenario | Expected |
|---|---|---|
| Critical | Preview migration URL points to production | Verification fails before Prisma |
| Critical | Fork/Dependabot PR | Secretless CI only; no privileged deploy |
| Critical | Production deploy without approval | Cannot migrate/deploy |
| Critical | PR close cleanup | Deletes exact preview branch only |
| Critical | PR modifies deploy workflow/scripts | Protected preview trust gate blocks unattended secret release |
| Critical | Workflow rerun | Reuses branch/deployment safely |
| High | PR with new migration | Preview migrate succeeds before app deploy |
| High | PR without migration | Existing branch remains usable |
| High | Authenticated preview E2E | Clerk dev user signs in and owned workflows pass |
| High | Production staged smoke fails | Production domain is not promoted |
| High | Expired upload cleanup schedule | Bounded cleanup runs with protected secret |

## Dependency Map

- Requires Phase 2 replayable baseline.
- Requires Phase 3 Clerk app flow and Phase 5 Blob env contract.
- Blocks final cleanup/verification in Phases 7-8.
- Enforces switching to a schema-only/sanitized preview parent before real production data.

## Success Criteria

- [ ] Every trusted PR deployment uses isolated `preview/pr-<number>`.
- [ ] Preview migrations run before preview deployment using direct URL only in job.
- [ ] Closed PR branches are deleted safely.
- [ ] Fork/Dependabot PRs never receive privileged provider secrets.
- [ ] Production migration/deploy requires approval, target verification,
  staged smoke, and explicit promotion.
- [ ] Generic CI no longer mutates a shared development/production database.
- [ ] Clerk-authenticated E2E runs against preview deployment.
- [ ] Expired upload intents are cleaned on a protected bounded schedule.

## Risk Assessment

- Risk: Vercel auto-deploy races with orchestrated deploy.
  Mitigation: disable Git deployment and designate GitHub Actions as sole owner.
- Risk: PR code/workflow exfiltrates provider secrets.
  Mitigation: no fork/Dependabot secrets, protected preview trust gate, least
  privilege, immutable actions, minimal cleanup workflow.
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
- Dependabot PRs must not receive privileged deployment secrets.
- Production branch protection is an additional control, not the only guard.
