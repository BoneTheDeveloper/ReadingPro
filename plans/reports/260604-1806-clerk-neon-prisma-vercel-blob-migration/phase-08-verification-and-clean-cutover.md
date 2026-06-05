---
phase: 8
title: "Verification and Clean Cutover"
status: pending
priority: P1
effort: "6h"
dependencies: [7]
---

# Phase 8: Verification and Clean Cutover

## Overview

Run the complete replay/security/user-flow/deployment verification suite and
perform the clean development-phase cutover. No legacy Supabase data is copied.

## Context Links

- [Plan](./plan.md)
- [Neon environment contract](../../../docs/database/neon-environment-contract.md)
- [Prisma migration guide](../../../prisma/MIGRATIONS.md)
- [E2E guide](../../../tests/e2e/README.md)
- [CI workflow](../../../.github/workflows/ci.yml)

## Requirements

- Functional:
  - All approved auth, authorization, database, storage, and branch workflows work.
  - Empty Neon branch can replay migrations and seed canonical data.
  - Production cutover uses approved environment and gated workflow.
  - 10 MB direct private upload and expired-intent cleanup work in deployed Vercel.
  - Fork/Dependabot workflows demonstrably receive no privileged secrets.
- Non-functional:
  - Verification leaves no running sessions/processes or leaked credentials.
  - Failed gates stop cutover.
  - Results are documented for handoff.

## Architecture

Verification layers:

```text
Static
  -> forbidden-term audit, Prisma validate, typecheck, lint
Data
  -> empty-branch migrate replay, seed, schema/type/FK checks
Automated behavior
  -> unit, integration, authorization matrix, build, E2E
Manual/provider
  -> localized Clerk flow, webhook, private Blob, preview branch lifecycle
Deployment
  -> target/approval dry run, staged production smoke, explicit promotion/cutover
```

## File Inventory

| Action | File/area | Change | Test impact |
|---|---|---|---|
| Modify | affected Vitest/integration/E2E suites | Final regression coverage | Full suite |
| Create | `plans/impliment_plan/.../reports/cutover-verification.md` | Record commands/results/provider checks | Handoff |
| Modify | plan dependency/status metadata after completion | Unblock compatible Issue 46 work | Planning |
| No code | Neon/Clerk/Vercel/Blob dashboards | Final environment verification | Manual |

## Verification Checklist

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm exec prisma format`
- [ ] `pnpm exec prisma validate`
- [ ] plain-PostgreSQL/Supabase forbidden migration audit
- [ ] fresh `prisma migrate deploy` on throwaway empty Neon branch
- [ ] dictionary seed and validation on throwaway branch
- [ ] schema inspection: text Clerk IDs, UUID domain IDs, expected FKs/indexes
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm test:coverage`
- [ ] `pnpm build`
- [ ] authenticated/public Playwright suites
- [ ] 10 MB direct private Blob upload/finalization and private download
- [ ] abandoned upload intent expiry/cleanup and finalization replay
- [ ] passage deletion and bounded user-deletion Blob cleanup/retry
- [ ] preview workflow create/migrate/deploy/test/delete
- [ ] fork/Dependabot secretless CI behavior
- [ ] production workflow approval/target-verification dry run
- [ ] production staged-deploy smoke and explicit promotion behavior

## Implementation Steps

1. Create a throwaway Neon branch from empty/current production baseline and run
   full migration replay plus canonical seed.
2. Inspect resulting schema and migration SQL for approved identity types and
   forbidden Supabase/RLS objects.
3. Run static, unit, integration, authorization, build, and E2E gates.
4. Manually verify:
   - English/Vietnamese embedded sign-in/sign-up;
   - first-use profile bootstrap before webhook;
   - verified user update/delete webhook;
   - 10 MB direct private upload, finalization replay, authorized download,
     cross-user denial, abandoned intent cleanup, passage/user cleanup;
   - sign-out and protected redirects.
5. Exercise a test PR through `preview/pr-N` lifecycle and confirm branch cleanup.
6. Exercise fork/Dependabot secretless behavior and production target/approval
   guard without unapproved mutation.
7. Perform clean production cutover: migrate, seed, staged deploy, smoke,
   explicitly promote; then reset or
   recreate `development` and `dev/luc` from approved baseline as documented.
8. Record evidence, known limitations, rollback references, and provider IDs
   without credentials.
9. Re-scan newest request/requirements and reconcile plan/dependency docs.

## Test Scenario Matrix

| Priority | End-to-end scenario | Expected |
|---|---|---|
| Critical | Fresh user signs up and immediately creates passage | Profile FK exists; request succeeds |
| Critical | User A attempts User B passage/chat/review/session/file | All denied/no mutation |
| Critical | Delete Clerk user with uploaded files | Blobs removed; DB rows cascaded |
| Critical | 10 MB upload on deployed Vercel | Direct Blob upload succeeds; no Function 413 |
| Critical | Abandon direct upload before finalization | Expired intent/blob cleaned |
| Critical | Fresh empty DB replay | Deploy + seed + app boot succeeds |
| Critical | Preview target spoof/misconfiguration | Workflow stops before migration |
| Critical | Fork/Dependabot PR | No privileged secret-bearing job |
| High | `/en` and `/vi` auth flows | Correct localized embedded UI/redirects |
| High | PR lifecycle | Exact branch created, migrated, used, deleted |
| High | Production approval/promotion gate | No mutation without approval; no domain promotion before staged smoke |
| High | Active-source Supabase audit | Zero matches |

## Dependency Map

- Final phase; requires every prior phase.
- Completion unblocks Issue 46 plans after their Clerk string identity exception
  and upload contract references are reconciled.

## Success Criteria

- [ ] Every critical verification item passes; non-critical exceptions require
  explicit owner acceptance and evidence.
- [ ] Clean production/development/local Neon branch state matches mapping.
- [ ] Auth, cross-user authorization, Blob, webhook, and E2E flows pass.
- [ ] Preview branch lifecycle and production approval guard are demonstrated.
- [ ] Fork/Dependabot isolation, staged production smoke, and explicit promotion are demonstrated.
- [ ] Cutover report contains evidence and rollback instructions.
- [ ] No Supabase active dependency or migration object remains.

## Risk Assessment

- Risk: provider dashboard configuration differs from repository assumptions.
  Mitigation: manual provider verification before cutover.
- Risk: migration works on populated branch only because inherited objects exist.
  Mitigation: mandatory replay on empty throwaway branch.
- Risk: production deploy and migration version skew.
  Mitigation: backward-compatible migrations and gated migrate-before-deploy.
- Risk: cleanup succeeds in DB but fails externally.
  Mitigation: verify blob-first delete retry behavior before cutover.

## Security Considerations

- Use disposable test users/files and remove them after verification.
- Redact URLs/tokens/secrets from reports and CI output.
- Verify production runtime has pooled URL only and correct production Clerk/Blob keys.
