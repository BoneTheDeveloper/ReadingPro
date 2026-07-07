# Error Handling Layering — Typed Errors + Centralized `toHttp`

Brainstorm report. Agreed design for cleaning up `src/lib/http/route-errors.ts` and the error
flow across API routes.

## Problem

- `isOwnershipMissError` classifies "not found / not owned" by **fuzzy string matching** on error
  messages ([route-errors.ts:19-43](../../src/lib/http/route-errors.ts:19)). Fragile: reword a
  repo message or bump Prisma version → silently returns 500 instead of 404. False-positive risk
  too (a 500 message containing "…not found" wrongly mapped to 404).
- Same outcome (404) reached two different ways in the same feature: POST vocabulary uses
  `instanceof VocabularyServiceError`; DELETE/PATCH/review use `isOwnershipMissError` string-match.
- `isAuthenticationRequiredError` has a dead-code branch: `error.message === "Authentication
  required"` never fires (only source is the typed `AuthenticationRequiredError`, caught by
  `instanceof`).
- Each of ~15 routes repeats its own `try/catch` error→HTTP classification. Inconsistent: some
  Sentry-capture 500s, some don't; some log 401, some don't.

## Layered responsibility (agreed)

```
Prisma/raw → [repo/service: raise semantic error] → route (thin try/catch) → [toHttp(): translate to HTTP, one place]
                    WHERE the meaning is known                                    reuses existing route-error classifiers
```

- **Repo/service** — only layer that knows what actually happened (missing / not owned / constraint).
  Converts raw errors (Prisma) into domain errors (`NotFoundError`). After this point nothing else
  imports Prisma error types.
- **Boundary (`toHttp`)** — single function maps domain error → HTTP status + body. Reuses the
  existing `isAuthenticationRequiredError` / `getZodErrorMessage` helpers.
- **Route** — thin: `try { ... } catch (e) { return toHttp(e, log, route) }`.
- Service must NOT translate to HTTP (would couple domain to HTTP, break reuse in jobs/CLI). Route
  must NOT classify by string (it only receives an `Error`, can't know the meaning).

## Decisions locked

- **Prisma P2025 (Group 2):** option **(B)** — replace `findUniqueOrThrow` with `findUnique` +
  null-check, merging "missing" and "not owned" into a single `NotFoundError`. Removes the
  library-error branch entirely (no `error.code` matching needed for these paths). Also the
  security-correct behavior (don't reveal existence to a non-owner).
- **Uniformization accepted (intentional behavior change):** routing all 500s through `toHttp`
  means every 500 now `Sentry.captureException`s and 401/404 logging becomes uniform — some routes
  currently differ. This is desired, not a regression.
- **`withErrorHandler` wrapper (remove try/catch entirely): NOT now** — bigger surface (touches
  every route signature + logger creation). Start with `toHttp(e, log, route)`; revisit wrapper
  later if boilerplate still bothers.

## `toHttp` shape

```ts
// lib/http/route-errors.ts (already server-only, already holds the classifiers)
export function toHttp(e: unknown, log: Logger, route: string): NextResponse {
  if (isAuthenticationRequiredError(e)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (e instanceof NotFoundError)       return NextResponse.json({ error: e.message }, { status: 404 });
  if (e instanceof z.ZodError)          return NextResponse.json({ error: getZodErrorMessage(e) }, { status: 400 });
  log.error({ err: e }, `${route} failed`);
  Sentry.captureException(e, { tags: { route } });
  return NextResponse.json({ error: "Internal error." }, { status: 500 });
}
```

## File inventory (grep-verified 2026-07-07)

**New:** `NotFoundError` class (home TBD — likely `lib/http/route-errors.ts` or a sibling
`lib/http/domain-errors.ts`), `toHttp` in `route-errors.ts`.

**Repo/service throw-sites to convert to `NotFoundError` (Group 1 + 2):**
- `vocabulary/db/vocabulary-items.repository.ts:184,189` (findUniqueOrThrow + ownership → B)
- `vocabulary/db/vocabulary-item-progress.repository.ts:11,16,30,35` (B)
- `vocabulary/db/sets/vocabulary-sets.repository.ts:127,146,163`
- `passage/services/studio-artifacts.service.ts:92,110` — reuse existing `ArtifactNotFoundError`
  in same file (:16), or unify to shared `NotFoundError`.

**Leave alone (not ownership/404):** `passage/db/passage-queries.ts:90` (Zod validation),
`reading/db/translation-provider.ts:34,46` (provider/5xx).

**Routes classifying errors today (15 total; ownership subset = the 7 using `isOwnershipMissError`):**
`vocabulary/[id]`, `vocabulary/[id]/review`, `vocabulary/[id]/status`, `vocabulary/sets/[id]`,
`vocabulary/sets/[id]/items`, `vocabulary/sets/[id]/items/[itemId]`, `studio/questions` (ownership);
plus `vocabulary`, `vocabulary/list`, `vocabulary/stats`, `vocabulary/sets`, `learning-session`,
`progress/stats`, `upload`, `upload/text` (auth/zod only).

**Delete:** `isOwnershipMissError` + `isOwnershipMissMessage` (~25 lines) + dead-code auth string
branch in `isAuthenticationRequiredError`.

## Scope boundary

- Core: introduce `NotFoundError` + `toHttp`, convert the repo/service throw-sites, migrate the 7
  ownership routes fully, delete the string matchers.
- Migrating the other ~8 auth/zod-only routes to `toHttp` is recommended (uniformity) but can be a
  later phase — they don't have the string-match bug, only boilerplate.

## Success criteria

- No route classifies errors by message string anymore.
- `pnpm run typecheck && pnpm run lint` pass.
- 404/401/400/500 behavior preserved (or intentionally uniformized) for every migrated route —
  manual walk of each ownership route's not-found path.

## Next step

`/ck:plan` — phased: (1) `NotFoundError` + `toHttp`, (2) repo/service conversion, (3) route
migration + delete matchers, (4) optional broader `toHttp` adoption.
