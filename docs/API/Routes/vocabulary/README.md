# Vocabulary Domain API

The **Vocabulary** bounded context (`src/server/modules/vocabulary` +
`src/server/modules/spaced-repetition` engine) covers saving, browsing, reviewing, and
organizing vocabulary items. Routes are under `/api/vocabulary/*` and split by
sub-resource:

- **Items** (`/api/vocabulary`, `/api/vocabulary/list`, `/api/vocabulary/[id]`) — capture,
  browse, delete. The save path owns the dedup/store strategy.
- **Review** (`/api/vocabulary/[id]/review`, `/api/vocabulary/[id]/status`) — the
  spaced-repetition surface.
- **Sets** (`/api/vocabulary/sets/*`) — manual and auto (daily/weekly) collections.

## Items

| Sub-resource | Doc | Routes |
|---|---|---|
| Items | [items.md](items.md) | `POST /api/vocabulary`, `GET /api/vocabulary/list`, `DELETE /api/vocabulary/[id]` |

## Review (spaced repetition)

| Sub-resource | Doc | Routes |
|---|---|---|
| Review | [review.md](review.md) | `POST /api/vocabulary/[id]/review`, `PATCH /api/vocabulary/[id]/status` |

## Sets

| Sub-resource | Doc | Routes |
|---|---|---|
| Sets | [sets.md](sets.md) | `GET/POST /api/vocabulary/sets`, `PATCH/DELETE /api/vocabulary/sets/[id]`, `POST /api/vocabulary/sets/[id]/items`, `DELETE /api/vocabulary/sets/[id]/items/[itemId]` |

## Auth And Ownership

All routes require authentication. Ownership is enforced by checking `userId` on every
read/update/delete. Unauthenticated requests return `{ "error": "Authentication required." }`
with `401`. Ownership misses return `404`.

## Related

- Save data flow (happy/exception/edge/race): [vocabulary-flow.md](../../../Flows/data-flows/vocabulary-flow.md)
- Response contract coverage: [response-contract-coverage.md](../response-contract-coverage.md)

## Implementation

- Routes: `src/app/api/vocabulary/route.ts`, `src/app/api/vocabulary/list/route.ts`,
  `src/app/api/vocabulary/[id]/route.ts`, `src/app/api/vocabulary/[id]/status/route.ts`,
  `src/app/api/vocabulary/[id]/review/route.ts`, `src/app/api/vocabulary/sets/route.ts`,
  `src/app/api/vocabulary/sets/[id]/route.ts`, `src/app/api/vocabulary/sets/[id]/items/route.ts`,
  `src/app/api/vocabulary/sets/[id]/items/[itemId]/route.ts`
- Item queries: `src/server/db/vocabulary-queries.ts`
- Set queries: `src/server/db/vocabulary-set-queries.ts`
- Spaced-repetition engine: `src/server/modules/spaced-repetition/scheduler.ts`
