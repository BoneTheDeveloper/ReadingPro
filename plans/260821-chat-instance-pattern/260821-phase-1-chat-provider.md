---
phase: 1
title: "Create ChatProvider with Context"
status: completed
priority: P1
effort: 1.5h
dependencies: []
---

# Phase 1: Create ChatProvider with Context

## Overview

Create a React Context that holds Chat instance per passageId using `useState` (Option B - SSR-safe). Use `key={passageId}` to force remount on passage change.

## Requirements

- Functional: Chat state persists across panel close/open for the same passage
- Functional: Different passages get different Chat instances (via key remount)
- Functional: Logout clears all Chat instances
- Non-functional: SSR-safe, no memory leaks

## Architecture

```tsx
// chat-context.tsx
import { createContext, useContext, useState, useCallback } from "react";
import { Chat, DefaultChatTransport, type UIMessage } from "ai";

interface ChatContextValue {
  chat: Chat;
  clearChat: () => void;
  clearAllChats: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

// Global registry for logout cleanup
const chatRegistry = new Set<Chat>();

export function ChatProvider({ 
  passageId,
  initialMessages = [],
  children 
}: { 
  passageId: string;
  initialMessages?: UIMessage[];
  children: React.ReactNode;
}) {
  // useState ensures Chat instance persists across re-renders
  // but NOT across unmount (which we want for passage change)
  const [chat] = useState(() => {
    const newChat = new Chat({
      id: passageId,
      messages: initialMessages,
      transport: new DefaultChatTransport({ api: "/api/ai-chat" }),
    });
    chatRegistry.add(newChat);
    return newChat;
  });

  // Note: chat unmounts when passageId changes (key-driven)
  // No explicit cleanup needed - instance is garbage collected

  const clearChat = useCallback(() => {
    // For explicit reset - reinitialize with empty messages
    // This is handled by parent remounting with key change
  }, []);

  return (
    <ChatContext.Provider value={{ chat, clearChat }}>
      {children}
    </ChatContext.Provider>
  );
}

// For logout - clear all chat instances
export function clearAllChats() {
  chatRegistry.forEach(chat => chat.clearMessages?.());
  chatRegistry.clear();
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}
```

### Usage in StudioPanel

```tsx
<ChatProvider key={passageId} passageId={passageId} initialMessages={history}>
  <PassageReader />
  {isPanelOpen && <ChatPanel />}
</ChatProvider>
```

### State Sync Machine (Phase 1 scope)

| Trigger | Behavior |
|---------|----------|
| Provider mount | Create new Chat instance with DB data |
| Send message | useChat(chat) appends to instance |
| Stream chunks | useChat appends to instance |
| Close/open panel | Instance unchanged |
| Passage change | `key={passageId}` remounts → new instance |

## Implementation Steps

1. Create `src/features/studio/component/view/ai-chat/chat-context.tsx`
2. Export `ChatProvider`, `useChatContext`, `clearAllChats`
3. Update `StudioPanel` to wrap with `<ChatProvider key={passageId}>` using `key` for remount
4. Update `ChatDetailView` to use `useChat({ chat: useChatContext().chat })`
5. Wire `clearAllChats` to logout handler

## Success Criteria

- [ ] Opening same passage twice reuses the same Chat instance
- [ ] Opening different passages creates separate Chat instances (via key remount)
- [ ] Chat instance state survives panel close/open
- [ ] Logout clears all Chat instances
- [ ] No memory leaks after passage switches

## Related Code Files

- Create: `src/features/studio/component/view/ai-chat/chat-context.tsx`
- Modify: `src/features/studio/component/panel/studio-panel.tsx`
- Modify: `src/features/studio/component/view/ai-chat/chat-detail-view.tsx`
