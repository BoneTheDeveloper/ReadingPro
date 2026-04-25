# Research Report: Processing Item Rendering in Sidebar Panels

**Date:** 2026-08-01
**Topic:** Unified vs. specialized component approach for rendering pending/processing items in sidebar lists

---

## Executive Summary

**The current approach in the codebase is correct.** Using a single unified component (`ArtifactListItem`) with multiple states (`ready`, `pending`, `failed`) aligns with TanStack Query's official pattern and shadcn/ui design conventions. The issue is not the component design — it's that `pendingEntries` is never populated in the data flow.

---

## Key Findings

### 1. TanStack Query Official Pattern

TanStack Query's documentation explicitly recommends rendering pending items **inline in the same list** using the mutation's `isPending` state:

```tsx
// Official TanStack Query pattern
const addTodoMutation = useMutation({
  mutationFn: (newTodo: string) => axios.post('/api/data', { text }),
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
})

return (
  <ul>
    {todos.map((todo) => <li key={todo.id}>{todo.text}</li>)}
    {addTodoMutation.isPending && (
      <li style={{ opacity: 0.5 }}>{addTodoMutation.variables}</li>
    )}
  </ul>
)
```

**Source:** [TanStack Query Optimistic Updates](https://github.com/tanstack/query/blob/main/docs/framework/react/guides/optimistic-updates.md)

### 2. shadcn/ui Loading States

shadcn/ui uses a single `SidebarMenuSkeleton` component for all loading states — no specialized per-item components:

```tsx
<SidebarMenu>
  {Array.from({ length: 5 }).map((_, index) => (
    <SidebarMenuItem key={index}>
      <SidebarMenuSkeleton />
    </SidebarMenuItem>
  ))}
</SidebarMenu>
```

**Source:** [shadcn/ui Sidebar Loading States](https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/aria/sidebar.mdx)

### 3. Unified vs. Specialized Components

**Unified component wins when:**
- Items represent the same entity type (artifacts in a list)
- States are mutually exclusive (ready/pending/failed)
- The UI needs visual consistency

**Specialized components win when:**
- Pending items have fundamentally different affordances (e.g., cancel button, progress bar)
- Items are different entity types
- Separate placement is needed (e.g., outbox vs inbox)

---

## Current Code Analysis

### Sources Panel
- Uses `SourceProcessingItem` (specialized) — justified because:
  - Upload has distinct progress indication (shimmer animation)
  - Different entity type (upload state vs passage)

### Studio Panel  
- Uses `ArtifactListItem` with status prop — **correct approach**:
  - Same entity type (artifact)
  - Status is purely visual (opacity, border color, icon spin)
  - Matches TanStack Query's official pattern

---

## Recommendation

**The `ArtifactListItem` approach is correct.** The problem is architectural: `pendingEntries` is hardcoded as `[]` and never populated from mutation state.

The fix should:
1. Track pending mutations using `useMutationState` or local state
2. Pass pending entries to `DefaultStudioView`
3. Render them using the existing `ArtifactListItem` (pending status)

Do NOT create a specialized `ProcessingArtifactItem` component — this would:
- Violate DRY principle
- Diverge from TanStack Query's recommended pattern
- Add unnecessary complexity

---

## Unresolved Questions

1. Should pending artifacts be tracked globally (via `useMutationState`) or locally in the hook that calls `generateQuestion`?
2. Should pending items be persisted across page navigation or cleared on unmount?
