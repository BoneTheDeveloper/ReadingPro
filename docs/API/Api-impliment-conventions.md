# API Implementation Conventions

## Overview

Last researched: 2026-06-03.

Next.js App Router exposes API endpoints through `route.ts` files under
`app/`. Next.js is intentionally unopinionated about the rest of project
organization, so this repo uses a small layered convention around those route
handlers.

API code should keep HTTP concerns, business flow, data access, DTO types,
shared validation, pure helpers, and observability helpers separate. For route
families with multiple endpoints, reusable contracts/helpers live in a `shared/`
lib folder and endpoint-specific flow/query code lives in the matching route lib
folder. This keeps route handlers small and makes data-access behavior easier to
review.

Every API must also make its trust boundaries explicit. Validate untrusted
request input before use, keep trusted domain types separate from runtime
schemas, and define stable response contracts for frontend-consumed JSON APIs.

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
- This repo keeps reusable API logic under `src/lib` by default. This
  avoids turning route folders into mixed HTTP/domain/database modules.

## File Roles

| Pattern | Role | Should Contain | Should Not Contain |
| --- | --- | --- | --- |
| `route.ts` | HTTP boundary | Request/path/header/body parsing, route-local validation, auth, response shaping, route logs, route-level observability wrapper | Business ranking rules, raw SQL, Prisma query composition, reusable DTO definitions |
| `*-service.ts` | Use case / business flow | Normalization, business rules, orchestration, repository calls, DTO formatting | `NextRequest`, `NextResponse`, route status codes, Prisma/raw SQL |
| `*-repository.ts` | Prisma/raw SQL data access | Route-specific or shared Prisma queries, raw SQL, DB-specific filtering, candidate fetching, DB spans, DB return types | HTTP responses, auth, UI-facing business flow |
| `*-dto.ts` / `*-dtos.ts` | DTO types | Stable API input/output types, response unions, API-facing type constants | Runtime DB calls, HTTP handling |
| `*-schema.ts` | Shared runtime contracts | Reusable request, untrusted-data, and response Zod schemas | DB queries, endpoint business flow |
| `*-utils.ts` | Pure helpers | Deterministic helpers with no DB/network side effects | Prisma, raw SQL, auth, request/response handling |

Use `*-repository.ts` as the DB-access suffix for API route data access.

## Library Layout

For a route family, mirror the public route shape under `src/lib/<domain>/`:

```text
src/app/api/<domain>/<route>/route.ts
  -> src/lib/<domain>/<route>/<route>.service.ts
      -> src/lib/<domain>/<route>/<route>.repository.ts

src/lib/<domain>/shared/
  <domain>-dtos.ts
  <domain>-schema.ts        # only when shared
  <domain>-utils.ts
```

Use route-specific folders for behavior that belongs to one endpoint. Use
`shared/` only for types, builders, validation, normalization, observability
helpers, or pure utilities used by two or more endpoints in the same domain.

Do not put endpoint business flow in `shared/` just because another endpoint
might use it later. Move code to `shared/` when reuse exists and the shared
contract is stable.

## Layer Direction

Dependencies should flow downward:

```text
route.ts
  -> <route>/<route>.service.ts
      -> <route>/<route>.repository.ts
          -> db client / raw SQL

shared:
  shared/*-dto.ts / shared/*-dtos.ts
  shared/*-schema.ts       # only when shared
  shared/*-utils.ts
```

Avoid importing `route.ts` from application logic. Avoid importing service code
from repository files.

## Route Handlers

`route.ts` is the HTTP boundary. Keep it thin.

Route handlers should:

- read JSON bodies, query params, path params, multipart values, and important
  headers/cookies that affect behavior
- validate every untrusted request value before using it
- authenticate or authorize the user
- create request logs and route-level Sentry spans
- call one service function
- return the documented API response DTO

Route handlers should not:

- build Prisma queries
- contain raw SQL
- rank, dedupe, or hydrate domain candidates
- contain business fallback logic
- format complex DTOs beyond wrapping `{ success: true, data }`

Route-local schemas may stay in `route.ts`. Move schemas to `*-schema.ts` only
when reused.

Expected client validation failures should return stable `400` responses and
should not be captured as unexpected Sentry exceptions. Parse malformed JSON or
multipart input separately from unexpected service/server failures.

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

Use `*-repository.ts` for API route DB access. This includes both shared DB
helpers and use-case-specific read/write models.

Database access files should:

- keep SQL/Prisma-specific filtering close to the query
- return typed rows or domain-shaped records
- include DB-level Sentry spans when useful

Database access files should not produce API response DTOs unless the query is
explicitly a compact read model for that API. Even then, final DTO labels and
presentation fields should usually be completed in the service.

For raw SQL:

- keep the SQL in the repository file, not the route
- parameterize values through Prisma tagged templates
- document ranking/dedupe rules in nearby code when they are not obvious
- keep returned columns minimal and typed

## DTOs And Schemas

Use `*-dtos.ts` for stable API input/output types. Use `*-schema.ts` for runtime
contracts shared across routes, services, frontend consumers, or contract
tests.

Use `*-schema.ts` when a runtime contract is shared across multiple consumers,
such as a route, service, frontend caller, or contract test. If a request schema
is route-local, keeping it inside `route.ts` is fine.

DTO files should not import DB clients, `NextRequest`, or `NextResponse`.

## API Boundary Contracts

Use three separate contract layers. They solve different problems and should
not be collapsed into one schema or forced onto routes that do not need them.

### 1. Request Schema

Required for every untrusted structured request input:

- JSON body
- query parameters
- route/path parameters
- important headers or cookies that affect behavior

Use Zod for structured request contracts. Parse malformed JSON separately so it
returns `400`, not `500`. Validate identifiers as non-empty strings unless the
public API explicitly guarantees a specific format.

Choose unknown-key behavior explicitly. Zod objects strip unknown keys by
default, which can hide frontend/backend contract drift. Prefer strict request
objects for stable public contracts; allow or strip unknown keys only when
forward compatibility is intentional and documented.

Multipart input is an exception to JSON-style schemas. Parse `FormData`, then
narrow values explicitly, for example with `value instanceof File`. Malformed
multipart input and invalid entries must still return stable `400` responses.

Routes with no request input do not need artificial request schemas.

```ts
const translateRequestSchema = z.object({
  text: z.string().trim().min(1).max(500),
  context: z.string().trim().min(1).max(4000),
  sourceId: z.string().min(1),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
});
```

### 2. Domain Type Or Schema

Use TypeScript types/interfaces by default for trusted internal values. Do not
add Zod schemas only to duplicate compile-time domain types.

Use Zod or another runtime validator when internal-looking data actually crosses
an untrusted runtime boundary:

- external API response
- database JSON field
- file import
- environment/config value
- LLM structured output
- cached JSON
- loosely typed provider result

When a runtime schema is required, infer the TypeScript type from the schema so
the runtime and compile-time contracts cannot silently drift.

```ts
export const translationDataSchema = z.object({
  translation: z.string(),
  type: z.enum(["word", "phrase", "sentence"]).nullable(),
  provider: z.enum(["cache", "dictionary", "google_translate", "fallback"]),
});

export type TranslationResult = z.infer<typeof translationDataSchema>;
```

### 3. Response DTO Schema

Required for frontend-consumed stable JSON APIs.

The response contract must describe:

- stable success data DTO
- success envelope
- stable error envelope
- optional diagnostic/performance fields when they are part of the response

Runtime-validate response JSON in at least one of these places:

- frontend parsing, before using `data`
- backend contract tests

Prefer both for critical routes. Frontend parsing protects production callers
from backend/proxy/stale-deployment drift. Backend contract tests catch defects
before release without adding response-validation cost to every server request.

```ts
export const translateSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: translationDataSchema,
});

export const apiErrorResponseSchema = z.object({
  error: z.string(),
});
```

Do not return raw Prisma/service objects unless they are intentionally defined
and documented as the stable API DTO.

Streaming responses are an explicit exception. Validate their request and
protocol-specific events/contracts instead of forcing a JSON success-response
schema onto the stream.

## Utilities

`*-utils.ts` must stay pure:

- no DB calls
- no network calls
- no auth/session access
- no mutation outside local scope

Examples: string normalization, selection-key building, deterministic ranking
score helpers, and formatting helpers that do not need IO.

## Coding Pattern

```ts
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const user = await getAuthenticatedUser();
  const data = await runUseCase(parsed.data, { userId: user.id });

  return NextResponse.json({ success: true, data });
}
```

```ts
export async function runUseCase(input: UseCaseInput, context: UseCaseContext) {
  const normalized = normalizeInput(input.q);
  if (normalized.length < 2) return [];

  const rows = await findCandidates({ normalized, userId: context.userId });
  return rows.map(toDto);
}
```

```ts
export async function findCandidates(input: CandidateInput) {
  return db.$queryRaw<CandidateRow[]>`SELECT ... WHERE value = ${input.normalized}`;
}
```

```ts
export async function fetchUseCase(input: RequestInput) {
  const response = await fetch("/api/example", {
    method: "POST",
    body: JSON.stringify(input),
  });

  const payload: unknown = await response.json();
  return successResponseSchema.parse(payload).data;
}
```

The route validates and authenticates, the service owns the use case, and the
repository owns data access plus DB spans. Frontend callers treat network JSON
as untrusted and parse it before use.

## Review Checklist

Before merging API route work, check:

- Route handler contains no Prisma query, raw SQL, or business ranking logic.
- Every accepted JSON body, query param, path param, multipart value, and
  behavior-affecting header/cookie is explicitly validated.
- Malformed JSON/multipart and structurally invalid client input return stable
  `400` responses without unexpected Sentry capture.
- Auth/authorization happens before user-scoped data access.
- Service returns data, not `NextResponse`.
- Repository returns typed rows or domain records, not HTTP responses.
- Trusted domain values use TypeScript types by default; untrusted runtime data
  uses runtime schemas.
- Frontend-consumed stable JSON APIs define response DTO/schema contracts.
- Critical frontend callers parse response JSON at runtime, and backend contract
  tests verify complete response shapes.
- Raw Prisma/service objects are exposed only when intentionally documented as
  stable API DTOs.
- Shared code is used by more than one route or has a stable cross-route
  contract.
- Logs, Sentry metadata, and diagnostic metrics do not include raw sensitive user
  input.

## References

- Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Next.js `route.ts` file convention: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Next.js Project Structure: https://nextjs.org/docs/app/getting-started/project-structure
- Next.js `NextRequest`: https://nextjs.org/docs/app/api-reference/functions/next-request
- Next.js `NextResponse`: https://nextjs.org/docs/pages/api-reference/functions/next-response
