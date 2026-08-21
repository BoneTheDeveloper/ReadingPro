---
phase: 2
title: "Fix Route Handler with originalMessages"
status: pending
priority: P1
effort: 1h
dependencies: []
---

# Phase 2: Fix Route Handler with originalMessages

## Overview

Update the `/api/ai-chat` route handler to:
1. Pass `originalMessages` to `toUIMessageStreamResponse`
2. Add `generateMessageId` for consistent ID generation
3. Persist full message history in `onFinish`

## Current Problems

```typescript
// Current - BROKEN
return result.toUIMessageStreamResponse({
  onFinish: ({ responseMessage }) => {
    // Only saves assistant message, not full history
    await persistAssistantMessage(userId, passageId, responseMessage);
  },
});
```

## Requirements

- Functional: Route receives and returns consistent message IDs
- Functional: Full message history persisted in `onFinish`
- Functional: Stream error/stop does NOT persist anything

## Architecture

```typescript
// Fixed route handler
import { generateId } from "ai";

export const POST = withErrorHandling("ai-chat", async (req) => {
  const body = await req.json();
  const parsed = studyChatRequestSchema.safeParse(body);
  // ... validation ...

  const { messages, passageId, language } = parsed.data;

  // Persist user messages BEFORE streaming
  for (const msg of messages) {
    if (msg.role === "user") {
      await persistUserMessage(userId, passageId, msg as UIMessage);
    }
  }

  const result = await streamStudyChat({
    userId,
    passageId,
    passage: { id: passage.id, content: passage.content, title: passage.title },
    messages: messages as UIMessage[],
    language,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: () => generateId(),
    onFinish: async ({ responseMessage }) => {
      // Only persist assistant message - user messages already persisted
      if (responseMessage) {
        await persistAssistantMessage(userId, passageId, responseMessage);
      }
      // NOTE: Stream error/stop → onFinish NOT called → nothing persisted
    },
  });
});
```

## State Sync Machine (Phase 2 scope)

| Trigger | Chat Instance | Database |
|---------|---------------|----------|
| Send message | Append user message | Persisted BEFORE stream |
| Stream chunks | Append to assistant | — |
| Stream end | Complete version | `onFinish` → assistant persisted |
| Stream error/stop | Keep partial | NOT persisted (onFinish not called) |
| Close/open panel | Instance unchanged | Don't touch |
| Passage change | Provider remount → new instance | Read once |

## Implementation Steps

1. Import `generateId` from `ai`
2. Add `originalMessages` parameter to `toUIMessageStreamResponse`
3. Add `generateMessageId` function
4. Persist user messages BEFORE streaming
5. Keep `onFinish` for assistant message persistence only

## Success Criteria

- [ ] `originalMessages` passed to `toUIMessageStreamResponse`
- [ ] `generateMessageId` function provided
- [ ] User messages persisted before stream
- [ ] Assistant message persisted in `onFinish`
- [ ] Stream error/stop does NOT persist (by design)
- [ ] TypeScript compiles without errors

## Risk Assessment

- **Risk**: Duplicate user messages on retry
- **Mitigation**: DB has unique constraint on (userId, passageId, createdAt) OR dedup by message ID
- **Signal**: Duplicate entries in chat_messages table

## Related Code Files

- Modify: `src/app/api/ai-chat/route.ts`
- Modify: `src/features/studio/schema/ai-chat.ts`
