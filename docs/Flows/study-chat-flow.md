# Study Chat Flow

## POST Stream

```text
Client chat panel
  -> POST /api/study/chat
  -> validate messages and passageId
  -> enforce message count and user-text limits
  -> getAuthenticatedUser()
  -> load owned Passage
  -> load recent StudyChatMessage history
  -> persist latest user message
  -> stream AI tutor response with passage context
  -> onFinish persist assistant message
```

## GET History

```text
GET /api/study/chat?passageId=...
  -> validate passageId
  -> authenticate
  -> load messages by userId + passageId
  -> return UI message parts
```

## Guardrails

- Passage content is treated as untrusted learner-provided data.
- The system prompt tells the tutor not to follow instructions embedded in passage content.
- Passage content is truncated to the route maximum before model input.
- Chat history is scoped to authenticated user and passage.

## Code Paths

- Route: `src/app/api/study/chat/route.ts`
- UI: `src/features/study/ui/studio/chat/chat-panel.tsx`
- Prompt helper: `src/server/ai/prompt-utils.ts`
- Model config: `src/server/ai/model-config.ts`
