# API Conventions

## Overview

Last researched: 2026-06-03.

Next.js App Router exposes API endpoints through `route.ts` files under
`app/`. Next.js is intentionally unopinionated about the rest of project
organization, so this repo uses a small layered convention around those route
handlers.

API code should keep HTTP concerns, business flow, data access, DTO types,
shared validation, pure helpers, and performance instrumentation separate. This
keeps route handlers small and makes query-budget work easier to review.

Use this convention for new API work and when refactoring existing API routes.

## Next.js Ground Rules

These are framework constraints or recommendations from current Next.js docs:

- Route Handlers live in `route.ts` files under the `app` directory.
- Route Handlers use the standard Web `Request` and `Response` APIs. Use
  `NextRequest` and `NextResponse` only when their helpers are useful.
- A `route.ts` file defines handlers for HTTP methods such as `GET`, `POST`,
  `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`.
- Dynamic route params in App Router route handlers are asynchronous
  (`params: Promise<...>`). Await them before use.
- Files can be colocated under `app/` without becoming public routes unless a
  special route file such as `page.tsx` or `route.ts` exists.
- This repo still keeps reusable API logic under `src/lib` by default. This
  avoids turning route folders into mixed HTTP/domain/database modules.

## File Roles

| Pattern | Role | Should Contain | Should Not Contain |
| --- | --- | --- | --- |
| `route.ts` | HTTP boundary | Request/path/header/body parsing, route-local validation, auth, response shaping, route logs, route-level performance wrapper | Business ranking rules, raw SQL, Prisma query composition, reusable DTO definitions |
| `*-service.ts` | Use case / business flow | Normalization, business rules, orchestration, repository calls, DTO formatting | `NextRequest`, `NextResponse`, route status codes, Prisma/raw SQL |
| `*-repository.ts` | Prisma/raw SQL data access | Shared or use-case-specific Prisma queries, raw SQL, DB-specific filtering, candidate fetching, DB spans, DB return types | HTTP responses, auth, UI-facing business flow |
| `*-dto.ts` / `*-dtos.ts` | DTO types | API input/output DTO types, response unions, API-facing type constants | Runtime DB calls, HTTP handling |
| `*-schema.ts` | Shared Zod validation | Reusable Zod schemas used by multiple routes/services | Route-only schemas, DB queries |
| `*-utils.ts` | Pure helpers | Deterministic helpers with no DB/network side effects | Prisma, raw SQL, auth, request/response handling |
| `*-performance.ts` | Performance helpers | Performance headers, trackers, snapshots, metric helpers | Business logic, query composition |

Use `*-repository.ts` as the single DB-access suffix for new API work. Existing
`*-queries.ts` files are legacy/shared-data-access modules; do not create new
ones. Rename them opportunistically only when already touching their API surface.

## Layer Direction

Dependencies should flow downward:

```text
route.ts
  -> *-service.ts
      -> *-repository.ts
          -> db client / raw SQL

shared:
  *-dto.ts / *-dtos.ts
  *-schema.ts       # only when shared
  *-utils.ts
  *-performance.ts
```

Avoid importing `route.ts` from application logic. Avoid importing service code
from repository files.

## Route Handlers

`route.ts` is the HTTP boundary. Keep it thin.

Route handlers should:

- read query params, path params, headers, or JSON body
- validate route-local request shape with Zod or simple checks
- authenticate or authorize the user
- create request logs and route-level Sentry spans
- call one service function
- return the API response
- attach performance snapshots when a performance header requests them

Route handlers should not:

- build Prisma queries
- contain raw SQL
- rank, dedupe, or hydrate domain candidates
- contain business fallback logic
- format complex DTOs beyond wrapping `{ success: true, data }`

Route-local schemas may stay in `route.ts`. Move schemas to `*-schema.ts` only
when reused.

## Services

`*-service.ts` owns the use case.

Services should:

- normalize inputs
- enforce business rules such as minimum query length
- call repositories or shared query helpers
- merge, rank, dedupe, or select domain results when the rule is not DB-specific
- map database rows into API DTOs

Services should not depend on `NextRequest`, `NextResponse`, or route status
codes.

Services should return domain/API results, not HTTP responses.

## Queries And Repositories

Use `*-repository.ts` for all new DB access. This includes both shared DB
helpers and use-case-specific read/write models.

Do not create new `*-queries.ts` files. Existing `*-queries.ts` files can stay
until a related refactor makes renaming cheap.

Database access files should:

- keep SQL/Prisma-specific filtering close to the query
- return typed rows or domain-shaped records
- include DB-level Sentry spans when useful
- preserve query-budget expectations

Database access files should not produce API response DTOs unless the query is
explicitly a compact read model for that API. Even then, final DTO labels and
presentation fields should usually be completed in the service.

For raw SQL:

- keep the SQL in the repository file, not the route
- parameterize values through Prisma tagged templates
- document ranking/dedupe rules in nearby code when they are not obvious
- keep returned columns minimal and typed

## DTOs And Schemas

Use `*-dto.ts` or `*-dtos.ts` for stable API input/output types.

Use `*-schema.ts` only when validation is shared by more than one route or
service. If a Zod schema is route-local, keeping it inside `route.ts` is fine.

DTO files should not import DB clients, `NextRequest`, or `NextResponse`.

## Utilities

`*-utils.ts` must stay pure:

- no DB calls
- no network calls
- no auth/session access
- no mutation outside local scope

Examples: string normalization, selection-key building, deterministic ranking
score helpers, and formatting helpers that do not need IO.

## Performance Helpers

`*-performance.ts` is for reusable performance infrastructure:

- opt-in performance headers
- trackers and snapshots
- metric payload types
- helper functions for benchmark-only response metadata

Keep benchmark policy and budgets in the benchmark suite or API flow docs, not
inside route handlers.

## Example Skeleton

```ts
// src/app/api/example/route.ts
export async function GET(request: NextRequest) {
  const parsed = schema.safeParse(readParams(request));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const user = await getAuthenticatedUser();
  const data = await runExampleUseCase(parsed.data, { userId: user.id });

  return NextResponse.json({ success: true, data });
}
```

```ts
// src/lib/example/example-service.ts
export async function runExampleUseCase(input: ExampleInput, context: ExampleContext) {
  const normalized = normalizeExample(input.q);
  if (normalized.length < 2) return [];

  const rows = await findExampleCandidates({ normalized, userId: context.userId });
  return rows.map(toExampleDto);
}
```

```ts
// src/lib/example/example-repository.ts
export async function findExampleCandidates(input: CandidateInput) {
  return db.$queryRaw<CandidateRow[]>`SELECT ... WHERE value = ${input.normalized}`;
}
```

## Dictionary API Examples

All dictionary routes follow the target split:

### Search (`GET /api/dictionary/search`)

| Layer | File |
| --- | --- |
| HTTP boundary | `src/app/api/dictionary/search/route.ts` |
| Use case / business flow | `src/lib/dictionary/dictionary-search-service.ts` |
| Raw SQL candidate search | `src/lib/dictionary/dictionary-search-repository.ts` |
| DTO types | `src/lib/dictionary/dictionary-dtos.ts` |
| Pure normalization helper | `src/lib/dictionary/normalize-dictionary-term.ts` |
| Performance helper | `src/lib/dictionary/dictionary-performance.ts` |

### Lookup (`GET /api/dictionary/lookup`)

| Layer | File |
| --- | --- |
| HTTP boundary | `src/app/api/dictionary/lookup/route.ts` |
| Use case / business flow | `src/lib/dictionary/dictionary-lookup-service.ts` |
| DB access (Prisma + raw SQL) | `src/lib/dictionary/dictionary-lookup-repository.ts` |

### Entry Detail (`GET /api/dictionary/entries/:entryId`)

| Layer | File |
| --- | --- |
| HTTP boundary | `src/app/api/dictionary/entries/[entryId]/route.ts` |
| Use case / business flow | `src/lib/dictionary/dictionary-entry-detail-service.ts` |
| DB access | `src/lib/dictionary/dictionary-entry-detail-repository.ts` |

### Suggest (`GET /api/dictionary/suggest`)

| Layer | File |
| --- | --- |
| HTTP boundary | `src/app/api/dictionary/suggest/route.ts` |
| Use case / business flow | `src/lib/dictionary/dictionary-suggest-service.ts` |
| DB access | `src/lib/dictionary/dictionary-suggest-repository.ts` |

### Shared across dictionary routes

| Concern | File |
| --- | --- |
| DTO types | `src/lib/dictionary/dictionary-dtos.ts` |
| DTO building (entry + translation) | `src/lib/dictionary/dictionary-entry-dto-builder.ts` |
| Pure normalization helper | `src/lib/dictionary/normalize-dictionary-term.ts` |
| Performance helper | `src/lib/dictionary/dictionary-performance.ts` |

The route validates and authenticates, the service normalizes and formats
DTOs, and the repository owns all DB queries plus DB spans.

## References

- Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Next.js `route.ts` file convention: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Next.js Project Structure: https://nextjs.org/docs/app/getting-started/project-structure
- Next.js `NextRequest`: https://nextjs.org/docs/app/api-reference/functions/next-request
- Next.js `NextResponse`: https://nextjs.org/docs/pages/api-reference/functions/next-response
