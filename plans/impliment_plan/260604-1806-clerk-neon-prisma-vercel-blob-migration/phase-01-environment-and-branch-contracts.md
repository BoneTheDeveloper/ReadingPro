---
phase: 1
title: "Environment and Branch Contracts"
status: pending
priority: P1
effort: "4h"
dependencies: []
---

# Phase 1: Environment and Branch Contracts

## Overview

Provision and document deterministic provider/environment boundaries before
code changes. Establish one Neon project with protected production, persistent
development branches, and temporary PR branches. Separate development and
production Clerk/Blob resources.

## Context Links

- [Plan](./plan.md)
- [Current env template](../../../.env.example)
- [Current Prisma config](../../../prisma.config.ts)
- [Current CI](../../../.github/workflows/ci.yml)
- [Neon Vercel integration](https://neon.com/docs/guides/vercel/)
- [Vercel environment variables](https://vercel.com/docs/projects/environment-variables)

## Requirements

- Functional:
  - Local `.env.local` targets `dev/luc`.
  - Vercel Development targets `development`.
  - Each PR targets exactly one `preview/pr-<number>`.
  - Vercel Production targets protected `production`.
  - Development and production use separate Clerk instances and private Blob stores.
- Non-functional:
  - Runtime receives pooled DB credentials only.
  - Direct DB credentials are limited to trusted migration contexts.
  - Branch creation/deletion is deterministic and idempotent.

## Architecture

```text
Neon project
production (protected)
├── development
│   └── dev/luc
└── preview/pr-N (temporary, parent production)

Provider boundary
local + Vercel Development + Preview -> Clerk dev + Blob dev
Vercel Production                    -> Clerk prod + Blob prod
```

Use explicit GitHub Actions orchestration for preview branches because exact
`preview/pr-<number>` naming and one branch per PR are required. Do not enable a
second automatic preview-branch integration that would create duplicate Neon
branches.

## File Inventory

| Action | File | Change | Test impact |
|---|---|---|---|
| Modify | `.env.example` | Replace Supabase envs with Clerk, Neon, Blob, webhook, and automation contract | Infrastructure smoke checks |
| Create | `docs/database/neon-environment-contract.md` | Branch topology, secret ownership, reset rules, migration permissions | Documentation review |
| Modify | `.gitignore` | Confirm local Clerk/Vercel/Neon files and `.env*` secrets stay ignored | Smoke check |

## Environment Contract

| Context | `DATABASE_URL` | `DIRECT_URL` | Auth/Blob |
|---|---|---|---|
| Local | `dev/luc` pooled | `dev/luc` direct | Clerk dev / Blob dev |
| Vercel Development | `development` pooled | Intentional migration context only | Clerk dev / Blob dev |
| Preview app runtime | `preview/pr-N` pooled | Not injected into runtime | Clerk dev / Blob dev |
| Preview migration job | Optional pooled | `preview/pr-N` direct | No app auth secret required |
| Production app runtime | `production` pooled | Not injected into runtime | Clerk prod / Blob prod |
| Production migration job | Optional pooled | `production` direct | No app auth secret required |

## Interface Checklist

- [ ] `DATABASE_URL` always means pooled runtime connection.
- [ ] `DIRECT_URL` always means direct Prisma migration connection.
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` matches deployment environment.
- [ ] `CLERK_SECRET_KEY` and `CLERK_WEBHOOK_SIGNING_SECRET` never reach clients.
- [ ] `BLOB_READ_WRITE_TOKEN` points to environment-specific private store.
- [ ] Neon automation secrets are GitHub-only, not application runtime envs.

## Implementation Steps

1. Create Neon `production`; enable branch protection.
2. Create `development` from `production`, then `dev/luc` from `development`.
3. Reserve `preview/pr-<number>` naming; parent previews from `production`.
4. Create Clerk development and production instances with email/password and
   Google OAuth settings required by current UX.
5. Create separate private Vercel Blob stores/tokens for development and production.
6. Define Vercel Development/Preview/Production variable ownership.
7. Define GitHub environments and secret owners for preview automation and
   production approval.
8. Update `.env.example`; document branch reset, seed, and forbidden operations.
9. Add an operational warning: before real production user data, change preview
   branching to schema-only or sanitized preview parent.

## Test Scenario Matrix

| Priority | Scenario | Expected |
|---|---|---|
| Critical | Inspect production runtime env | No `DIRECT_URL`, Neon API key, or dev provider keys |
| Critical | Inspect preview runtime env | Pooled URL points to `preview/pr-N`; no direct URL |
| High | Local `.env.local` connection check | Branch reports `dev/luc` |
| High | Vercel Development connection check | Branch reports `development` |
| High | Close PR | Temporary preview branch eligible for deletion |

## Dependency Map

- Blocks Phase 2 provider-specific baseline deployment.
- Blocks Phase 3 Clerk key/provider setup.
- Blocks Phase 5 Blob adapter setup.
- Defines contracts consumed by Phase 6 automation.

## Success Criteria

- [ ] All four environment mappings are explicit and non-ambiguous.
- [ ] `production` is protected; `development` and `dev/luc` exist.
- [ ] Development/production Clerk and Blob resources are separate.
- [ ] Direct URLs and provider admin secrets are excluded from app runtime.
- [ ] Environment contract doc identifies owners, reset rules, and data-copy risk.

## Risk Assessment

- Risk: `vercel env pull` overwrites local `dev/luc` URLs with `development`.
  Mitigation: document separate pull file/explicit local override.
- Risk: preview branches copy future production PII.
  Mitigation: mandatory pre-launch switch to schema-only/sanitized parent.
- Risk: duplicate Neon preview integrations create extra branches.
  Mitigation: select one GitHub Actions owner for branch lifecycle.

## Security Considerations

- Production secrets live only in protected GitHub/Vercel production environments.
- Use least-privilege Neon automation credentials where available.
- Never commit connection strings, Clerk secrets, Blob tokens, or webhook secrets.
