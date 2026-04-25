# Plan: Add Pending State to Artifact List

## Context

The `ArtifactListItem` component already supports `pending` status, but `pendingEntries` is never populated. TanStack Query's `useMutationState` provides a clean way to track pending mutations.

## Approach

Use `useMutationState` to track in-flight artifact mutations and render them inline using the existing `ArtifactListItem` component.

## Files to Modify

1. **`src/features/studio/hook/use-artifact-pending.ts`** (new) - Hook to track pending mutations
2. **`src/features/studio/component/panel/studio-panel.tsx`** - Import and use the pending hook
3. **`src/app/(dashboard)/study/_component/study-workspace.tsx`** - Wire up pending state

## Implementation Steps

### Step 1: Create `useArtifactPending` hook

```typescript
import { useMutationState } from "@tanstack/react-query";
import { StudioArtifactType } from "@/generated/prisma/enums";

interface PendingEntry {
  submittedAt: number;
  type: StudioArtifactType;
}

export function useArtifactPending(passageId: string | null) {
  return useMutationState<PendingEntry>({
    filters: {
      mutationKey: ["artifact", "generate"],
      status: "pending",
    },
    select: (mutation) => ({
      submittedAt: mutation.state.submittedAt ?? Date.now(),
      type: mutation.state.variables?.type ?? StudioArtifactType.QUESTION,
    }),
  });
}
```

### Step 2: Update `StudioPanel` props

Add `pendingEntries: PendingEntry[]` prop (rename from current hardcoded `[]`).

### Step 3: Update `DefaultStudioView`

Use the passed `pendingEntries` instead of the empty array.

## Acceptance Criteria

- [ ] Pending mutations appear in artifact list with spinner and "Đang tạo..." text
- [ ] Pending items disappear when mutation succeeds or fails
- [ ] No new components created (reuse `ArtifactListItem`)
- [ ] TypeScript passes
