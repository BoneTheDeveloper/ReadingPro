# Code Standards

## Architecture Rules

- Keep Next.js route handlers thin: parse, authenticate, call service/repository, return response.
- Put feature UI, hooks, workflows, and server actions under `src/features/<feature>/`.
- Put shared infrastructure under `src/lib/`.
- Avoid feature-to-feature imports. Move truly shared logic to `src/lib/`.
- Keep generated Prisma code isolated under `src/generated/prisma/`.
- Keep folder-specific rule docs beside their executable assets. `docs/` should link to `prisma/` and `tests/` rule docs instead of duplicating them.

## TypeScript

- Use strict TypeScript.
- Prefer explicit input/output types for service boundaries.
- Use `unknown` plus narrowing instead of `any`.
- Use Zod for external input: route bodies, query params, server action payloads, generated AI JSON.
- Keep runtime DTOs close to the route/service that owns the contract.

## Next.js Boundaries

- Default to Server Components for pages and layouts.
- Add `"use client"` only for browser state, effects, refs, event handlers, browser APIs, or streaming UI hooks.
- Route handlers live in `src/app/api/**/route.ts`.
- Server actions stay in feature modules and must authenticate before user-owned writes.
- API routes and server actions must not trust client-provided ownership fields.

## Data Access

- Import `db` from `@/lib/db/client`.
- Query modules under `src/lib/db/*-queries.ts` own app-domain Prisma access.
- Dictionary repositories may use raw SQL when required for performance or grouping correctness.
- Always include `userId` in user-owned reads/writes.
- Use soft deletion for passages through `deletedAt`.
- Select only fields needed for public/API DTOs.

## API Contracts

- Successful JSON responses use `{ success: true, data }` unless the route is a streaming route.
- Failed JSON responses use `{ error: string }` with an appropriate status.
- Auth failures should return `401`.
- Missing owned resources should return `404`.
- Validation failures should return `400`.

## Observability

- Use `createRequestLogger` in route handlers when request context is useful.
- Use `log.error({ err: error }, message)` for server-side errors.
- Capture route failures with `Sentry.captureException(error, { tags: { route, method } })`.
- Use `Sentry.startSpan` around meaningful auth, DB, storage, and AI steps.
- Use performance headers only behind explicit performance fixture/header gates.

## Naming

| Kind | Convention |
|------|------------|
| Components/hooks/services | kebab-case files |
| Next pages/layouts/routes | Next.js file conventions |
| Docs | kebab-case, except existing `Api-*` files retained for compatibility |
| Tests | colocated `*.test.ts` / `*.test.tsx` |

**Status:** Active  
**Last Updated:** 2026-06-06
