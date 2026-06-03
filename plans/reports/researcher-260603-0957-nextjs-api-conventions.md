# Research Report: Next.js API Conventions

Conducted: 2026-06-03 09:57 Asia/Ho_Chi_Minh

## Executive Summary

Next.js App Router defines the HTTP entrypoint convention: API endpoints live in
`route.ts` files under `app/` and export HTTP method functions. Next.js does not
prescribe service/repository layers, so the right convention for this repo is a
thin `route.ts` plus domain code under `src/lib`.

Recommendation: keep `route.ts` as HTTP boundary only, move use-case flow to
`*-service.ts`, use `*-repository.ts` as the single DB-access suffix, and keep
DTO/schema/utils and performance helpers separate.

## Research Methodology

- Sources consulted: 5 official Next.js docs pages.
- Date range: current crawled/updated Next.js App Router docs, including 2026
  route/project-structure/function references.
- Key terms: Next.js Route Handlers, route.ts convention, App Router project
  structure, NextRequest, NextResponse.

## Key Findings

### Route Handler Boundary

Next.js Route Handlers are defined by `route.ts` inside the `app` directory and
export HTTP method handlers such as `GET`, `POST`, `PATCH`, and `DELETE`.
Handlers use Web `Request` and `Response`; `NextRequest` and `NextResponse`
extend those APIs with convenience helpers.

Implication for this repo: `route.ts` should stay close to HTTP semantics:
parse, validate, auth, call service, respond.

### Project Organization

Next.js is unopinionated about project organization beyond file-system routing.
It allows colocation, but a route becomes public only when a route/page special
file exists.

Implication for this repo: keeping reusable logic under `src/lib` is aligned
with Next.js and avoids bloated route folders.

### Data Access

Next.js does not define a Prisma pattern. Query budget and maintainability are
repo concerns. This repo should use one DB-access suffix for clarity:
`*-repository.ts`. Existing `*-queries.ts` files are legacy naming, not the
target convention.

## Recommendations

1. Keep `route.ts` thin.
2. Use `*-service.ts` for business flow and DTO mapping.
3. Use `*-repository.ts` for shared DB operations and use-case-specific raw SQL
   or optimized query composition.
4. Do not create new `*-queries.ts` files; migrate existing ones only when
   already touching their API surface.
5. Use `*-schema.ts` only for shared Zod schemas; route-local schemas can stay
   in `route.ts`.
6. Keep `*-utils.ts` pure and DB-free.
7. Keep `*-performance.ts` limited to instrumentation helpers.

## Updated Artifact

- `docs/API/Api-impliment-conventions.md`

## References

- Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Next.js `route.ts` file convention: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Next.js Project Structure: https://nextjs.org/docs/app/getting-started/project-structure
- Next.js `NextRequest`: https://nextjs.org/docs/app/api-reference/functions/next-request
- Next.js `NextResponse`: https://nextjs.org/docs/pages/api-reference/functions/next-response

## Unresolved Questions

- None.
