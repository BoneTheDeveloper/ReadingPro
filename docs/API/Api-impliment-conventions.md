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

## Layer Direction

```text
route.ts
  -> service/workflow
      -> query module or repository
          -> db client / provider / storage adapter
```

Routes should not contain raw SQL, ranking logic, provider fallbacks, or complex DTO building.

## File Roles

| Pattern | Role |
|---------|------|
| `route.ts` | HTTP boundary, parsing, validation, auth, status codes. |
| `*-service.ts` | Business flow, fallback order, DTO assembly. |
| `*-repository.ts` | Prisma/raw SQL data access. |
| `*-queries.ts` | App-domain Prisma query helpers. |
| `*-dtos.ts` | Stable API types and DTO builders. |
| `*-schema.ts` | Reused runtime schemas. |

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

## References

- `src/app/api/translate/route.ts`
- `src/app/api/study-chat/route.ts`
- `src/app/api/dictionary/lookup/route.ts`
- `src/app/api/upload/route.ts`
