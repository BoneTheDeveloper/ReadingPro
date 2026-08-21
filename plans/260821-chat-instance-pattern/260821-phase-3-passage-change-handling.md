---
phase: 3
title: "Handle Passage Deletion & Logout Cleanup"
status: completed
priority: P2
effort: 1h
dependencies: [1, 2]
---

# Phase 3: Handle Passage Deletion & Logout Cleanup

## Overview

Handle passage deletion while chat is open, and wire logout to clear all Chat instances. Note: passage *switching* is handled automatically by `key={passageId}` in Phase 1.

## Scenarios

| Scenario | Behavior |
|----------|----------|
| Delete current passage | Close chat panel, delete DB rows |
| User logs out | Clear all Chat instances from registry |
| Stream in progress when deleted | Panel closes → stream aborts naturally |

## Architecture

### Passage Deletion

```tsx
// In passage deletion flow
async function handleDeletePassage(passageId: string) {
  // 1. If chat panel is open, close it first (stream will abort naturally)
  if (currentView?.contentType === "chat") {
    onViewChange(null);
  }

  // 2. Delete passage from DB (cascade deletes chat_messages)
  await deletePassage(passageId);

  // 3. Invalidate queries
  queryClient.invalidateQueries(chatQueries.all());
  queryClient.invalidateQueries(passageQueries.all());
}
```

### Logout Cleanup

```tsx
// In auth/logout flow
import { clearAllChats } from "@/features/studio/component/view/ai-chat/chat-context";

async function handleLogout() {
  // 1. Clear all Chat instances
  clearAllChats();

  // 2. Clear query cache
  queryClient.clear();

  // 3. Perform logout
  await signOut();
}
```

## Implementation Steps

1. Find where `useDeletePassageMutation` is used and add chat panel close logic
2. Wire `clearAllChats` to logout handler
3. Test deletion while streaming scenario

## Success Criteria

- [ ] Deleting passage while chat open closes panel
- [ ] Logout clears all Chat instances
- [ ] Chat history is cascade-deleted when passage is deleted
- [ ] Stream aborts gracefully on deletion

## Risk Assessment

- **Risk**: Chat instance cleanup conflicts with pending stream
- **Mitigation**: Close panel before deletion → unmount → stream aborts naturally
- **Signal**: Orphaned streams in DevTools

## Related Code Files

- Modify: `src/features/passage/api/mutations.ts`
- Modify: `src/features/auth/components/sign-out-button.tsx` (or wherever logout happens)
