## Docs
 Read the most relevant detailed doc before editing code.

## Transport

All client↔server I/O goes through Route Handlers.

- Reads: `GET` + `useQuery()`
- Writes: `POST/PATCH/DELETE` + `useMutation()`
- Slow/retryable work (AI pipelines, file processing) runs in Vercel Workflow;
  route handler only triggers it and returns `202 Accepted`.
- RSCs call services directly (function calls) and prefetch into
  `HydrationBoundary`. RSCs never fetch their own Route Handlers.

## API & Query Structure

### Directory Structure

```
src/features/[feature]/
├── server/service/           # server-only
├── schema.ts | schema/       # Zod: response models + input schemas (shared)
├── api/
│   ├── queries.ts            # <entity>Queries: queryOptions factories. 
│   └── mutations.ts          # use<Verb><Entity>Mutation hooks
├── hook/                     # client state + orchestration only (no server state)
└── component/

app/api/[entity]/route.ts     # route handler impls (parse → auth → service → toHttp)
app/api/[entity]/[id]/route.ts
```

### Conventions

**Query keys** are defined once, inside the `queryOptions` factory. Read them as
`<entity>Queries.<x>().queryKey` — never redefine a key inline, never add a
`query-keys.ts`. `queryOptions` brands the key with its data type, so
`setQueryData` is type-checked against the query's shape.

**`api/queries.ts` must not carry `"use client"`.** It exports plain option
objects, not hooks, so Server Components can import it for prefetch. That is
what removed the need for a separate key module.

**RSC prefetch** overrides `queryFn` with an **explicitly annotated** return
type, so a service shape drift is a compile error:

```ts
await queryClient.prefetchQuery({
  ...passageQueries.list(),
  queryFn: (): Promise<PassageListItem[]> => listPassagesForUser(userId),
});
```

**Disabled queries** use `skipToken` (not `enabled`), which removes the
non-null assertion in the `queryFn`.

**Mutations stay hooks**, not `mutationOptions` factories — they need
`useQueryClient()` for cache writes. Revisit only if `useIsMutating` is needed.

**`api/` holds server state; `hook/` holds client state.** A `useState` in an
`api/` module means a wrapper is duplicating what `useMutation`/`useQuery`
already returns.

**Route ownership:** Belongs to the feature that owns the response, not the parent path.

**HTTP methods:** GET reads, POST creates, PATCH updates, DELETE removes. No PUT.

**Function naming by layer:**
| Layer | Verbs | Example |
|-------|-------|---------|
| Handler | list/get/create/update/delete + Entity | `listPassages` |
| Service | same + `ForUser` when user-owned | `listPassagesForUser` |
| Mutation | `use<Verb><Entity>Mutation` | `useDeletePassageMutation` |

**Rules:**
- Every `queryFn`/`mutationFn` goes through `fetchJson(url, schema, init)`.
  Bare `fetch` + `!res.ok` in a feature module is a bug. `204` routes pass `z.void()`.
- `find*` returns `null` on miss; `get*` (service) decides null → NotFound
- Zod: instances camelCase, types PascalCase

## Error Handling

### Error Flow

```
Service (throw AppError) → Route Handler (withErrorHandling catches) → Response.json
                                           ↓
                        fetchJson parses envelope → throws ApiError
                                           ↓
                        QueryCache/MutationCache onError → log
                                           ↓
                              error.tsx / global-error.tsx (render)
```

### Server Errors

- **Services**: throw `AppError` — never log, never try/catch
- **Route Handlers**: wrap with `withErrorHandling` — single logging point

### Client Errors

- **`lib/api/fetch-json.ts`**: every `queryFn`/`mutationFn` goes through
  `fetchJson(url, schema, init)`. It reads the server envelope and throws
  `ApiError { status, code, message, details }`. Never hand-roll a `!res.ok` check.
- **QueryCache onError**: `console.error`, skip if `query.meta?.silent`
- **MutationCache onError**: `console.error`
- **mutations.ts**: onMutate/onError only for cache rollback — no toast, no log

### File Responsibilities

| Layer | Responsibility |
|-------|----------------|
| `server/service/` | throw AppError |
| `app/api/*/route.ts` | withErrorHandling wrapper |
| `lib/api/fetch-json.ts` | parse envelope → throw ApiError |
| `queries.ts` | call `fetchJson`; no error handling of its own |
| `mutations.ts` | cache rollback only |
| `lib/query-client.ts` | retry policy + error logging |
| `app/error.tsx` | segment boundary |
| `app/global-error.tsx` | fatal fallback |

## Common Checks

Use the smallest relevant verification:

```bash
pnpm typecheck
pnpm lint
pnpm knip
```
