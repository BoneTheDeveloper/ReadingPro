# API Implementation Conventions
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

Route handlers must not pass raw Prisma rows to `NextResponse.json`. Map to a named DTO
at the route boundary. Two accepted patterns:

- **Inline mapper** (collocated in the same directory as `route.ts`, e.g.
  `vocabulary-dto-mapper.ts`): `data: toVocabularyDTO(item)` — use when the mapper is
  only needed by this one route. Extract to a sibling file rather than embedding in
  `route.ts` so the pure function can be unit-tested without pulling in the Prisma client.
- **Contract mapper** (in `src/contracts/`): `data: toStudySessionDto(session)` — use
  for shared or structurally non-trivial mappings.

## Response Contract

- Success: `{ success: true, data }`
- Error: `{ error: string }`
- Streaming exception: `POST /api/study/studio/chat`
- Do not return raw Prisma rows. Map to the route's named DTO before responding (see
  Delegation above).
- Coerce Prisma `Date` fields to ISO strings with `new Date(x).toISOString()`, not
  `.toISOString()` directly — the latter throws when the value is already a string (e.g.
  in test environments or serialized input).
- If the client parses the response with a `.strict()` Zod schema, the DTO must match
  that schema field-for-field. Unrecognized keys cause a silent `safeParse` failure on
  the client; the save appears to succeed on the server but the client treats it as an
  error.

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
- Do not log user-generated content (selected text, context sentences, translations,
  or any other learner-supplied data) in request loggers or Sentry metadata.

## Reference Routes

- `src/app/api/translate/route.ts`
- `src/app/api/study/studio/chat/route.ts`
