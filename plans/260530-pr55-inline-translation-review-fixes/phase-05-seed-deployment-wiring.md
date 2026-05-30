---
phase: 5
title: "Seed Deployment Wiring"
status: pending
priority: P2
effort: "1.5h"
dependencies:
  - 2
---

# Phase 5: Seed Deployment Wiring

## Overview

Make dictionary seeding and non-AI provider configuration explicit operational steps so fresh environments do not silently ship with an empty `dictionary_entries` table or a broken sentence/paragraph quick translation path.

## Main Info

- Problem: Short-selection quick translation depends on `dictionary_entries`, but fresh environments can run migrations without ever populating the dictionary. Sentence/paragraph quick translation also needs a configured non-AI provider endpoint if the implementation does not use a fixed public endpoint.
- Resolve: Add an explicit seed command and document when/how to run it after migrations without wiring it into `next build`. Document the non-AI provider configuration and failure behavior for sentence/paragraph quick mode.

## Requirements

- Functional: Add a repo script that runs `prisma/seed-dictionary.ts`.
- Functional: Document when to run the seed command relative to migrations.
- Functional: Document any environment variable required for the non-AI quick translation provider.
- Non-functional: Do not run seed automatically during `next build`.
- Non-functional: Keep the seed idempotent through existing upsert behavior.

## Architecture

The seed remains a standalone TypeScript script using the Prisma adapter and `DIRECT_URL`/`DATABASE_URL`. `package.json` should expose the command, and docs should describe local and deployment usage.

Provider configuration should live in environment variables only if needed. If the first implementation uses a fixed Google Translate-compatible public endpoint, docs should still identify the provider as non-AI and describe that provider failure returns the existing translation API error instead of falling back to AI.

## Related Code Files

- Modify: `package.json`
- Modify: `.env.example`
- Modify: `docs/API/translation-flow.md`
- Modify: `docs/database/data-dictionary.md` if seed behavior is documented there
- Read: `prisma/seed-dictionary.ts`

## Implementation Steps

1. Add `db:seed` or `db:seed:dictionary` script using the repo's existing `tsx` dev dependency, and document that the command expects dev/tooling dependencies to be available unless a production-safe runner is added later.
2. If adding both names is useful, make one alias the canonical command and avoid script sprawl.
3. Document that fresh environments should run migrations before the dictionary seed.
4. Document required environment variables: `DIRECT_URL` preferred, fallback to `DATABASE_URL`.
5. Document non-AI provider configuration or fixed-provider behavior for sentence/paragraph quick translation.
6. Run the seed command only if a safe local database URL is configured; otherwise verify the command shape without touching external data.

## Success Criteria

- [ ] `package.json` exposes an explicit dictionary seed command.
- [ ] Docs explain the seed step and avoid implying it runs automatically.
- [ ] Docs explain sentence/paragraph quick translation uses a non-AI provider after cache miss and never falls back to AI.
- [ ] The seed remains idempotent and does not require a new migration.

## Risk Assessment

Seeding can write to real databases. Do not execute it against an unknown production connection during implementation; command verification is enough unless the environment is clearly local/test.
