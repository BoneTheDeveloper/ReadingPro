# API Implementation Conventions

How to write an API route handler. Layer boundaries and where each file type lives
(services, queries, shared contracts, feature clients) are owned by
[`../codebase-summary.md`](../codebase-summary.md) *Source Boundary Rules* — this doc
does not restate folder layout, only route-handler behavior.

## Route Handler Structure

Route handlers live in `src/app/api/**/route.ts` and should stay thin:

1. Import framework utilities, Sentry, Zod, auth, logger, and services.
2. Define route-local Zod schemas when the schema is not shared.
3. Parse request body/query/path params.
4. Validate untrusted input before business logic.
5. Authenticate with `getAuthenticatedUser()` when protected.
6. Verify user ownership before user-owned reads/writes.
7. Call a service, query module, or repository.
8. Return `NextResponse.json` or a documented stream response.
9. Catch auth, validation, and unknown errors separately where useful.

## Delegation

Routes are HTTP adapters only. Keep out of `route.ts`: raw SQL, ranking logic, provider
fallbacks, and complex DTO building. Push reusable backend logic into the server domain
modules and shared contracts/types into the contract layer — see
[`../codebase-summary.md`](../codebase-summary.md) for the exact folders.

## Response Contract

- Success: `{ success: true, data }`
- Error: `{ error: string }`
- Streaming exception: `POST /api/study-chat`

## Validation

- Use Zod for JSON body, query, and path contracts.
- Parse malformed JSON separately and return `400`.
- Narrow multipart values explicitly with `instanceof File`.
- Prefer strict schemas for stable public contracts.

## Auth And Ownership

- Use `getAuthenticatedUser()` for protected routes.
- Treat Clerk user id as `UserProfile.id`.
- Filter user-owned resources by authenticated `userId`.
- Return `404` for missing or unauthorized owned resources where possible.

## Observability

- Create request loggers for routes with meaningful context.
- Use `Sentry.startSpan` around auth, DB, AI, and storage steps.
- Capture unexpected failures with route and method tags.
- Do not capture expected validation failures as unexpected exceptions.

## Reference Routes

- `src/app/api/translate/route.ts`
- `src/app/api/study-chat/route.ts`
- `src/app/api/dictionary/lookup/route.ts`
- `src/app/api/upload/route.ts`
