---
title: "Phase 2: StudioArtifact async status"
status: todo
priority: P1
effort: "0.5d"
dependencies: ["phase-01-schema-passage-async"]
---

# Phase 2: StudioArtifact async status

## Overview

Apply the same async status pattern to `StudioArtifact`: convert `POST /api/artifact/question` to create a PENDING row, run AI in `after()` from `next/server`, update status on completion. Update `useArtifactList` query to poll while any artifact is non-terminal. Delete `useArtifactPending` hook — its data now lives in the artifact list query.

After this phase, refreshing the page during question generation preserves the in-flight UI.

**Validated decisions (2026-08-02 validation session):**
- `after()` from `next/server` — verified available in Next.js 16.2.9 docs; your 16.2.12 has it.
- **No retry endpoint.** User decided to keep current pending/error UX and add a cleanup mechanism for stuck rows instead. Drop `useRetryArtifact` and `onRetry` from `ArtifactListItem`.
- `ArtifactListItem` keeps current prop surface (`title, icon, status, subtitle, errorMessage, onClick, onDelete`). Failed artifacts just show the error message — user re-clicks "Generate" tile to start a new run.

## Requirements

- [ ] `StudioArtifact` gains `status: ProcessingStatus @default(COMPLETED)` and `statusError: String?`
- [ ] Existing artifact rows backfill to `status: COMPLETED`
- [ ] `POST /api/artifact/question` returns immediately with `status: PENDING` row
- [ ] AI generation runs in `after()` and updates status
- [ ] `useArtifactList` query polls while any artifact has non-terminal status
- [ ] `useArtifactPending` hook deleted
- [ ] `StudioPanel` and `DefaultStudioView` simplified to read pending state from `artifacts` data only
- [ ] `pnpm typecheck && pnpm lint && pnpm knip` clean

## Architecture

### Data flow
```
POST /api/artifact/question
  ├─ Validate passageId, find passage
  ├─ db.studioArtifact.create({ status: PENDING, content: null })
  ├─ after(() => generateAndStore(artifactId, passage.content))
  └─ Response 201 with status: PENDING artifact

after() callback (runs after response is sent; bounded by maxDuration):
  ├─ generateComprehensionQuestions(passage.content)
  ├─ db.studioArtifact.update({ id }, { content, status: COMPLETED })
  └─ on error: db.studioArtifact.update({ id }, { status: FAILED, statusError })
```

### Schema change (additive to Phase 1)
```prisma
model StudioArtifact {
  // ... existing
  status      ProcessingStatus @default(COMPLETED)  // existing rows are done
  statusError String?
}
```

Note: `content: Json` becomes `content: Json?` since PENDING rows have no content yet.

### Client polling
```typescript
// queries.ts
export function useArtifactList(passageId: string | null) {
  return useQuery({
    queryKey: artifactKeys.list(passageId ?? ""),
    queryFn: ({ signal }) => fetchArtifactList(passageId!, signal),
    enabled: Boolean(passageId),
    refetchInterval: (query) => {
      const artifacts = query.state.data ?? [];
      const hasPending = artifacts.some(a => a.status !== "COMPLETED" && a.status !== "FAILED");
      return hasPending ? 2000 : false;
    },
  });
}
```

### UI simplification
`DefaultStudioView` no longer needs `pendingEntries` prop. It iterates `artifacts` and reads `status` from each item to drive the `ArtifactListItem`'s existing `status` prop. **No retry prop** — failed artifacts just show the error message; user re-clicks the "Generate" tile to start a new run.

```tsx
{artifacts.map(a => (
  <ArtifactListItem
    key={a.id}
    status={mapProcessingStatus(a.status)}  // "pending" | "failed" | "ready"
    errorMessage={a.statusError}
    onClick={() => a.status === "COMPLETED" && onOpenArtifact(a.type, a.id)}
  />
))}
```

### Stuck-row cleanup mechanism
Failed artifacts shouldn't accumulate forever. MVP is two paths:

**1. Client-side delete affordance (Phase 2 implementation):**
- Failed and stale-pending rows are deletable via existing `DELETE /api/artifact/[id]` (already in the API). User can manually remove stuck rows from the UI.
- No new endpoint — just ensures the existing `DELETE` route works on FAILED/PENDING rows.

**2. Server-side retention (NOT in MVP):**
- Deferred to a future plan when production data shows FAILED rows accumulating. PENDING rows are intentionally not cleaned by cron — they are a live signal.
- See [Phase 4: MVP cleanup rules](./phase-04-stuck-state-cleanup.md) for the MVP rules.

## Related Code Files

**Modify:**
- `prisma/schema.prisma` — make `content` nullable, add status fields
- `src/app/api/artifact/question/route.ts` — split into create + after()
- `src/features/studio/server/service/artifact-crud.ts` — accept status + nullable content in create, add `updateArtifactStatus(id, status, statusError)`
- `src/features/studio/server/service/question-generator.ts` — extract a function that takes `artifactId` and updates on completion
- `src/features/studio/queries.ts` — add `refetchInterval`, include `status` + `statusError` in schema
- `src/features/studio/schema/artifact.ts` — add status fields to list item schema
- `src/features/studio/mutations.ts` — keep `useGenerateQuestion` (now thin: POST + invalidate)
- `src/features/studio/component/panel/studio-panel.tsx` — drop `useArtifactPending`, drop `pendingEntries` prop
- `src/features/studio/component/panel/default-studio-view.tsx` — drop `pendingEntries` prop, render `artifacts` uniformly

**Delete:**
- `src/features/studio/hook/use-artifact-pending.ts`
- `PendingEntry` type usage in `DefaultStudioView`

**Verify existing DELETE works on FAILED/PENDING:**
- `src/app/api/artifact/[id]/route.ts` — confirm `DELETE` doesn't gate on `status`. (Per Phase 1's route handler review, ownership check `userId === user.id` is the only guard.)

## Implementation Steps

1. **Schema**: make `StudioArtifact.content` nullable, add `status` (default COMPLETED for existing rows) and `statusError`.
2. **Generate migration**: `pnpm prisma migrate dev --name add_processing_status_to_artifact`. Backfill existing rows in same migration.
3. **Update `artifact-crud.ts`**:
   - `createArtifact` accepts `status: ProcessingStatus` (default COMPLETED for backward-compat) and nullable content
   - Add `updateArtifactStatus(id, userId, status, statusError?, content?)`
   - `listArtifactsForUser` selects `status`, `statusError` (and content? — currently excluded from list, keep that)
4. **Update `question-generator.ts`**: extract `generateAndStoreArtifact(artifactId, passageId)` that runs AI + updates.
5. **Refactor `POST /api/artifact/question`**:
   - Validate input
   - Find passage (404 if missing)
   - Create artifact with `status: PENDING`, `content: null`
   - `after(() => generateAndStoreArtifact(artifact.id, passageId))`
   - Return 201 with PENDING artifact (no content)
6. **Update `studio/queries.ts`**:
   - Include `status` + `statusError` in `studioArtifactListItemSchema`
   - Add `refetchInterval` to `useArtifactList` while any artifact is non-terminal
7. **Update `mutations.ts`**: `useGenerateQuestion` becomes thin — POST + invalidate. No client-side pending tracking needed.
8. **Simplify `StudioPanel`**: remove `useArtifactPending` import + call, drop `pendingEntries` prop from `DefaultStudioView`.
9. **Simplify `DefaultStudioView`**: iterate `artifacts` uniformly, map `artifact.status` to existing `ArtifactListItem` props.
10. **Delete `use-artifact-pending.ts`**.
11. **Verify**: typecheck, lint, knip. Test by generating questions and refreshing during AI.

## Success Criteria

- [ ] Migration succeeds; existing artifacts backfilled to COMPLETED
- [ ] POST `/api/artifact/question` returns <200ms with PENDING artifact
- [ ] AI generation completes in background; artifact flips to COMPLETED
- [ ] Failure path: AI throws → artifact flips to FAILED with `statusError`
- [ ] Page refresh during generation preserves "processing" UI
- [ ] `useArtifactList` polls every 2s while any artifact non-terminal; stops when all terminal
- [ ] Failed artifact shows error message in `ArtifactListItem` (no retry button — uses existing `errorMessage` prop)
- [ ] Failed/stale-pending artifact is deletable via existing `DELETE /api/artifact/[id]`
- [ ] `useArtifactPending` file deleted
- [ ] `pnpm typecheck && pnpm lint && pnpm knip` clean

## Risk Assessment

- **Content nullability**: `StudioArtifact.content` becoming nullable may break existing reads. Verify all readers handle null (only `getArtifact` reads content; UI shows "ready" only when content exists).
- **No retry UX (validated decision)**: failed artifacts rely on user re-clicking the "Generate" tile. Stuck rows can be manually deleted via existing `DELETE /api/artifact/[id]` route.
- **Stuck rows accumulating**: if `after()` crashes before flipping status to COMPLETED/FAILED, the row stays PENDING forever. PENDING is a live signal — not cleaned by cron. User deletes via existing DELETE route. FAILED rows also rely on user delete + re-trigger for MVP.
- **`after()` lifetime**: bounded by route's `maxDuration` config. AI calls (gpt-4o-mini, ~5-10s) fit well within default 30s for `/api/artifact/question`. Document this in route handler.
- **Race condition (mitigated)**: with no retry button, the only race is user double-clicking "Generate". Existing `generateQuestion.isPending` guard via mutation state handles this.

## Acceptance Tests

```typescript
// Manual
1. Click "Generate questions" → artifact appears immediately with status PENDING
2. Refresh page during generation → pending UI preserved
3. Wait for completion → artifact flips to "ready", polling stops
4. Mock AI failure → artifact shows "failed" with error message (no retry button)
5. Delete the failed artifact via dropdown → row removed, polling stops
6. Click "Generate" again → new PENDING artifact created
7. TypeScript, lint, knip pass
```