---
phase: 7
title: "Supabase Removal and Documentation"
status: pending
priority: P2
effort: "5h"
dependencies: [3, 4, 5, 6]
---

# Phase 7: Supabase Removal and Documentation

## Overview

Delete obsolete Supabase runtime/dev infrastructure and rewrite active
documentation/configuration to the final Clerk + Neon + Prisma + private Blob
architecture. Preserve historical finished plans/journals as historical records.

## Context Links

- [Plan](./plan.md)
- [Codebase summary](../../../docs/codebase-summary.md)
- [System architecture](../../../docs/system-architecture.md)
- [OAuth setup guide](../../../docs/auth/oauth-setup-guide.md)
- [Prisma migration guide](../../../prisma/MIGRATIONS.md)
- [Prisma security guide](../../../prisma/SECURITY.md)

## Requirements

- Functional:
  - No active code/config uses Supabase auth, database, storage, CLI, or RLS.
  - Active docs describe Clerk, Neon branch mapping, Prisma migrations, Blob access.
  - CSP permits only required Clerk/provider endpoints.
  - Active docs describe direct private Blob upload intents/finalization and the 10 MB limit.
- Non-functional:
  - Lockfile/workspace metadata has no Supabase dependency.
  - Automated audit prevents Supabase-specific migration/runtime reintroduction.
  - Historical reports/plans may retain accurate historical references.

## Architecture

Active source of truth after cleanup:

| Concern | Source |
|---|---|
| Authentication/profile lifecycle | Clerk + `src/lib/auth/` |
| Authorization | Services/repositories with explicit Clerk `userId` |
| Database/schema | Neon PostgreSQL + Prisma schema/migrations |
| Storage | Private Vercel Blob + authorized app route |
| Environments/branches | `docs/database/neon-environment-contract.md` |
| Deployment | GitHub Actions preview/production workflows |

## File Inventory

| Action | File/area | Change | Test impact |
|---|---|---|---|
| Delete | `src/lib/supabase/` | Remove browser/server/session clients | Build/audit |
| Delete | `src/lib/storage/supabase-storage.ts` | Remove old storage adapter | Build/audit |
| Delete | `supabase/` | Remove Supabase CLI/config | Audit |
| Delete | `tests/vitest/mocks/supabase.ts` | Remove old mocks | Unit setup |
| Modify | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` | Remove Supabase packages/allowBuilds | Install |
| Modify | `.gitignore`, `next.config.ts` | Remove Supabase temp/CSP; add exact Clerk CSP needs | Build/security |
| Modify | `.env.example` | Final provider/env contract review | Smoke |
| Rewrite | `README.md` | Clerk/Neon/Blob setup, local dev, test, deploy quick start | Docs review |
| Rewrite | `docs/codebase-summary.md`, `docs/system-architecture.md` | Final architecture | Docs review |
| Rewrite | `docs/auth/oauth-setup-guide.md` | Clerk Google OAuth/localized auth setup | Docs review |
| Rewrite | `prisma/MIGRATIONS.md`, `prisma/SECURITY.md` | Neon branches/plain PostgreSQL/app authorization | Docs review |
| Modify | `docs/database/*`, API upload docs, `tests/e2e/README.md`, localization docs | Schema/upload-intent/storage/auth/E2E truth | Docs review |
| Create/modify | source/config forbidden-term audit | Exclude historical archives only | CI |

## Removal Checklist

- [ ] `@supabase/ssr`, `@supabase/supabase-js`, and Supabase CLI removed.
- [ ] No `NEXT_PUBLIC_SUPABASE_*` or `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] No `src/lib/supabase`, `supabase/config.toml`, or active Supabase storage adapter.
- [ ] No RLS/auth schema/role/trigger migration docs.
- [ ] No Supabase domains in CSP.
- [ ] No stale callback route or Supabase E2E helper.
- [ ] No Supabase-specific auth error imports/classifiers remain.
- [ ] Active docs use `filePath`, not public `fileUrl`.
- [ ] Active upload docs distinguish private client upload token exchange from final application DTO.

## Implementation Steps

1. Run an active-source/config/docs Supabase inventory, excluding historical
   finished plans/reports/journals.
2. Delete superseded clients, config, storage adapter, mocks, and callback artifacts.
3. Remove packages and regenerate lockfile/workspace allow-build metadata.
4. Replace CSP Supabase entries with only the exact Clerk and Blob client-upload
   endpoints required; private Blob reads remain server-only.
5. Rewrite README and active architecture/auth/database/storage/E2E docs,
   including the 4.5 MB Function limit, 10 MB direct upload flow, intents,
   finalization, and cleanup.
6. Update Prisma security guide to make application authorization the only
   access-control model and explicitly prohibit RLS for now.
7. Add/extend automated audit for forbidden Supabase runtime/migration tokens
   with an explicit allowlist for accurate historical archives only.
8. Run install, lint, typecheck, build, tests, and audit to catch stale imports.

## Test Scenario Matrix

| Priority | Scenario | Expected |
|---|---|---|
| Critical | Install/build after package removal | No missing Supabase imports |
| Critical | Active source/config forbidden-term audit | Zero Supabase/RLS matches |
| High | CSP in authenticated app | Clerk UI/auth works; no broad stale Supabase domains |
| High | Docs/env review | All environment names and branch mappings match implementation |
| High | Upload docs review | 10 MB direct-to-Blob flow and cleanup match implementation |
| Medium | Historical plans/reports | Retained without affecting active audit |

## Dependency Map

- Requires active Clerk, authorization, Blob, and deployment replacements.
- Blocks final verification Phase 8.
- On completion, old Issue 46 plans can safely proceed with Clerk identity exception.

## Success Criteria

- [ ] No active Supabase package, code, config, env, CSP, mock, or doc remains.
- [ ] Active docs consistently describe final provider/security model.
- [ ] README and upload docs describe final setup and direct-upload architecture.
- [ ] Migration/security docs explicitly prohibit Supabase objects and RLS.
- [ ] Forbidden-term audit passes while preserving historical records.
- [ ] Clean dependency install and application build pass.

## Risk Assessment

- Risk: deleting Supabase package exposes an overlooked transitive import.
  Mitigation: remove only after replacement phases; run build and repository audit.
- Risk: CSP blocks Clerk in preview/production.
  Mitigation: test exact Clerk development/production domains before finalizing.
- Risk: docs contradict deployment workflows.
  Mitigation: cross-review environment contract, workflows, and `.env.example`.

## Security Considerations

- Avoid broad wildcard CSP entries when exact Clerk endpoints are known.
- Confirm no provider admin secret appears in public env examples.
- Keep historical secrets absent even in archived documentation.
