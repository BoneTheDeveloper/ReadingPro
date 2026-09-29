---
title: Plan src boundary restructure
date: 2026-09-29
summary: Planned moving src to client/server/shared by domain and Hono-native handlers (roadmap steps 1-5).
---

# Plan src boundary restructure

## What happened
Scouted `src/` and found three axes mixed at the top level: runtime (`server/`, `workflows/`), layer (`component/`, `lib/`), and domain (`features/`). The client had no root folder, so the ESLint boundary listed folders by hand. The backend was split by layer while the frontend was split by domain, and domain names had drifted (studio vs artifact/ai-chat, reading vs translate). Hono handlers still used a Next.js-shaped `withErrorHandling` wrapper.

## Decision
Option B: runtime first (`client/`, `server/`, `shared/`), same domain names inside each. Plan `plans/260929-0238-src-boundary-restructure` has 5 phases: client root, client naming + feature `index.ts`, server domain modules (workflows included), shared by domain with Prisma enums copied into `shared/enums.ts` plus a compile-time sync check, then Hono middleware, `zValidator`, `c.json()`, and `app.onError`.
User confirmed: keep the `@/*` alias, keep all API URLs, duplicate enums with a sync check, add feature entry points with a deep-import lint rule.

## Next steps
Run `/ak:cook plans/260929-0238-src-boundary-restructure/plan.md`. Watch where the Workflow SDK writes `.well-known/workflow` after `src/app` moves (Phase 1), and capture golden error responses before Phase 5.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
