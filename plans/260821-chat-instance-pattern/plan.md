---
title: "Chat Instance Pattern - Shared Chat State"
description: "Refactor useChat to use Chat instance via Context so chat state persists across panel close/open"
status: pending
priority: P2
effort: 3h
tags: [frontend, refactor]
created: 2026-08-21
---

# Plan: Chat Instance Pattern - Shared Chat State

## Context

Current implementation creates a new `useChat` instance every time `ChatDetailView` mounts. When user:
1. Opens chat → sends message → gets AI response
2. Closes panel → state lost from memory
3. Opens chat again → fetches from DB via `useQuery(chatQueries.history())`

**Problems:**
- Schema too strict → rejected AI SDK streaming parts → 400 errors
- Missing `originalMessages` + `generateMessageId` in route handler
- `useChat` recreated on each mount → potential state inconsistency
- No shared Chat instance → cannot maintain single source of truth

## Goals

1. Create `ChatProvider` (Option B - React Context + useState) that holds Chat instance per passageId
2. Chat instance persists across panel close/open
3. `key={passageId}` forces ChatProvider remount on passage change → auto-creates new instance
4. Fix route handler with `originalMessages` + `generateMessageId`
5. Clear all Chat instances on logout

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ StudioPanel                                                │
│  <ChatProvider key={passageId} passageId={passageId}>     │
│    <PassageReader />                                      │
│    {isPanelOpen && <ChatPanel />}  ← ChatDetailView       │
│  </ChatProvider>                                          │
└─────────────────────────────────────────────────────────────┘
```

### State Sync Machine

| Trigger | Chat Instance | Database |
|---------|---------------|----------|
| Provider mount | Create new, seed with DB data | Read once |
| Send message | Append user message | — |
| Stream chunks | Append to assistant | — |
| Stream end | Complete version | onFinish writes user + assistant |
| Stream error/stop | Keep partial | Don't write |
| Close/open panel | Keep unchanged | Don't touch |
| Passage change | Provider remount via key | Read once for new passage |
| Reset | clearChat() creates empty | Delete rows |
| Logout | Clear all instances | — |

### Passage Deletion/Switch Scenarios

| Scenario | Behavior |
|----------|----------|
| User deletes current passage | Delete DB rows, close panel if open |
| User switches passage | `key={passageId}` → ChatProvider remounts → new instance |
| User closes panel (same passage) | Chat instance stays alive |
| User opens panel (same passage) | Reuse existing Chat instance |
| User logs out | Clear all Chat instances |

## Related Files

- Modify: `src/features/studio/component/view/ai-chat/chat-detail-view.tsx`
- Modify: `src/app/api/ai-chat/route.ts`
- Create: `src/features/studio/component/view/ai-chat/chat-context.tsx`

## Phases

- [Phase 1](260821-phase-1-chat-provider.md) - Create ChatProvider with Context
- [Phase 2](260821-phase-2-route-handler-fix.md) - Fix route handler with originalMessages
- [Phase 3](260821-phase-3-passage-change-handling.md) - Handle passage deletion/switch & logout
