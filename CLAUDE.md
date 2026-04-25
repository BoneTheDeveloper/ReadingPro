## Docs
 Read the most relevant detailed doc before editing code.

## Navigation

- Do not read `node_modules` by default. If package API details are needed,
  inspect `package.json` and the lockfile first, then read only the specific package files required.
- When docs and code disagree, verify against code and ask the user about the conflict.


## Transport

All client↔server I/O goes through Route Handlers.

- Reads: `GET` + `useQuery()`
- Writes: `POST/PATCH/DELETE` + `useMutation()`
- Slow/retryable work (AI pipelines, file processing) runs in Vercel Workflow;
  route handler only triggers it and returns `202 Accepted`.
- External APIs (AI SDK, etc.) are called from services/workflows only.
- RSCs call services directly (function calls) and prefetch into
  `HydrationBoundary`. RSCs never fetch their own Route Handlers.

## API & Query Structure

### Directory Structure

```
src/features/[feature]/
├── server/                  # server-only
│   └── service
│   
├── schema (folder or file)            # Zod: response models + input schemas (shared)
├── queries.ts               # keys + queryOptions (fetcher inline)
├── mutations.ts             # useMutation hooks
└── components/

app/api/[entity]/route.ts     # route handler impls (parse → auth → service → toHttp)
app/api/[entity]/[id]/route.ts
```

### Conventions

**Query keys:** First segment = entity name. Only the owning feature defines the key factory. Other features import it — never redefine inline.

**Route ownership:** Belongs to the feature that owns the response, not the parent path.

**HTTP methods:** GET reads, POST creates, PATCH updates, DELETE removes. No PUT.


** 
**Function naming by layer:**
| Layer | Verbs | Example |
|-------|-------|---------|
| Handler | list/get/create/update/delete + Entity | `listPassages` |
| Service | same + `ForUser` when user-owned | `listPassagesForUser` |
| Mutation | `use<Verb><Entity>Mutation` | `useDeletePassageMutation` |

**Rules:**
- `fetch*` only in HTTP calls inside `queryFn`
- `find*` returns `null` on miss; `get*` (service) decides null → NotFound
- Zod: instances camelCase, types PascalCase

## Error Handling

### Error Flow

```
Service (throw AppError) → Route Handler (withErrorHandling catches) → Response.json
                                           ↓
                        QueryCache/MutationCache onError → toast + capture
                                           ↓
                              error.tsx / global-error.tsx (render)
```

### Server Errors

- **Services**: throw `AppError` — never log, never try/catch
- **Route Handlers**: wrap with `withErrorHandling` — single logging point

### Client Errors

- **QueryCache onError**: global toast + capture, skip if `query.meta?.silent`
- **MutationCache onError**: global toast using `mutation.meta?.errorMessage`
- **mutations.ts**: onMutate/onError only for cache rollback — no toast, no log
- **queries.ts**: check `!res.ok` → throw, no log

### Render Errors

- **error.tsx**: boundary per route segment (Next.js convention)
- **global-error.tsx**: fatal fallback, standalone (must include `<html>` + `<body>`)
- global-error.tsx must not depend on design system or context providers

### File Responsibilities

| Layer | Responsibility |
|-------|----------------|
| `server/service/` | throw AppError |
| `app/api/*/route.ts` | withErrorHandling wrapper |
| `queries.ts` | throw on bad response |
| `mutations.ts` | cache rollback only |
| `lib/query-client.ts` | global toast + capture |
| `app/error.tsx` | segment boundary |
| `app/global-error.tsx` | fatal fallback |

## Common Checks

Use the smallest relevant verification:

```bash
pnpm typecheck
pnpm lint
pnpm knip
```
## Working Rules

- Update docs when a code change alters product behavior, architecture,
  operations, API contracts, database shape, or test expectations.
