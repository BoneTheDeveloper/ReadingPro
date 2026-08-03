---
title: "Phase 1: Schema + Passage async status"
status: completed
priority: P1
effort: "0.5d"
dependencies: []
---

# Phase 1: Schema + Passage async status

## Overview

Add `ProcessingStatus` enum and `status` fields to `Passage`. Convert `POST /api/passage` from blocking to async: creates row with `PENDING`, runs AI in `after()`, updates to `COMPLETED`/`FAILED`. Client polls via `usePassage` query `refetchInterval`.

After this phase the user can refresh the page mid-AI-processing and see the in-flight state preserved from the database.

## Requirements

- [ ] New `ProcessingStatus` enum with `PENDING`, `COMPLETED`, `FAILED`
- [ ] `Passage` gains `status: ProcessingStatus @default(PENDING)` and `statusError: String?`
- [ ] `POST /api/passage` returns immediately with `status: PENDING` row
- [ ] AI processing runs in `after()` and updates status
- [ ] `usePassage` query polls while `status !== "COMPLETED" && status !== "FAILED"`
- [ ] Prisma migration generated and applied
- [ ] `pnpm typecheck && pnpm lint && pnpm knip` clean

## Architecture

### Data flow
```
POST /api/passage
  ├─ Validate input
  ├─ db.passage.create({ status: PENDING })
  ├─ after(() => runPassageProcessing(passageId))   // non-blocking
  └─ Response 201 with status: PENDING

after() callback (server-side):
  ├─ preprocessPassage(input)
  ├─ processPassage(...)
  ├─ db.passage.update({ id }, { content, title, cefrLevel, status: COMPLETED })
  └─ on error: db.passage.update({ id }, { status: FAILED, statusError: msg })
```

### Client
```typescript
// queries.ts
export function usePassage(id: string | null) {
  return useQuery({
    queryKey: passageKeys.detail(id ?? ""),
    queryFn: ({ signal }) => fetchPassage(id!, signal),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "COMPLETED" || status === "FAILED" ? false : 2000;
    },
  });
}
```

## Related Code Files

**Modify:**
- `prisma/schema.prisma` — add enum + 2 fields
- `src/app/api/passage/route.ts` — split into create + after()
- `src/features/passage/server/service/passage-crud.ts` — accept status in create
- `src/features/passage/server/service/passage-processing.ts` — wrap call in try/catch
- `src/features/passage/queries.ts` — add `refetchInterval`
- `src/features/passage/schema.ts` — include `status` and `statusError` in Passage type

**Create:**
- `src/features/passage/hook/use-passage-processing.ts` (optional) — `isProcessing: data?.status !== "COMPLETED"`

## Implementation Steps

1. **Schema migration**
   ```prisma
   enum ProcessingStatus {
     PENDING    @map("pending")
     COMPLETED  @map("completed")
     FAILED     @map("failed")
   }

   model Passage {
     // ... existing
     status      ProcessingStatus @default(PENDING)
     statusError String?
   }
   ```

2. **Backfill script** (in same migration): `UPDATE passage SET status = 'completed' WHERE status IS NULL` for existing rows (use Prisma migration `manual` step or run as `prisma db execute`).

3. **Generate Prisma client**: `pnpm prisma migrate dev --name add_processing_status` → review migration → `pnpm prisma generate`.

4. **Update `passage-crud.ts`** to accept optional `status` field on create (default `PENDING`).

5. **Refactor `POST /api/passage`**:
   - Keep validation + preprocessing logic
   - Create passage with `PENDING` before AI runs (content empty for now)
   - Use `after()` to invoke `processPassage` + update to `COMPLETED`/`FAILED`
   - Catch errors in `after()` and set `status: FAILED, statusError`

6. **Update `passage-processing.ts`**: Wrap the AI call in try/catch, expose `runProcessing(passageId, input)` function that the `after()` callback uses.

7. **Update `Passage` schema** (Zod): add `status: ProcessingStatus`, `statusError: z.string().nullable()`.

8. **Update `queries.ts`**: Add `refetchInterval` based on status (see Architecture above).

9. **Verify**: typecheck, lint, knip. Test by uploading a passage and refreshing during AI processing.

## Success Criteria

- [ ] `pnpm prisma migrate dev` succeeds; new enum visible in DB
- [ ] POST `/api/passage` returns in <200ms with `status: PENDING`
- [ ] AI processing completes in background; row updates to `COMPLETED`
- [ ] Failure path: throw in `processPassage` → row updates to `FAILED` with error message
- [ ] `usePassage` query polls every 2s while non-terminal
- [ ] Page refresh during AI processing preserves "processing" UI (verifies end-to-end)
- [ ] `pnpm typecheck && pnpm lint && pnpm knip` clean

## Risk Assessment

- **`after()` timing**: on Vercel, `after()` is bounded by `maxDuration`. AI calls fit in ~10s, well under default. Document in route handler.
- **Lost on cold start**: if server restarts between `PENDING` and AI completion, row stays `PENDING` forever. **Mitigation**: PENDING is a live signal — not cleaned by cron. User deletes via the existing `DELETE /api/passage/[id]` route; a future plan can add server-side reconciliation if needed.
- **Migration backfill**: existing rows have no `status`. Default `@default(PENDING)` would mark them as still processing. Backfill to `COMPLETED` in same migration.
- **Concurrent uploads**: two POSTs at once create two PENDING rows — this is fine, no race.

## Acceptance Tests

```typescript
// Manual
1. Upload a passage, observe status=PENDING in DB immediately
2. Refresh page mid-processing → UI still shows pending state
3. Upload a passage that fails AI (mock error) → row goes to FAILED, UI shows error message
4. Completed passage: status=COMPLETED, polling stops
```
