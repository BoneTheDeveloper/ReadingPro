---
phase: 2
title: "Real useChat Integration"
status: pending
priority: P1
effort: "1h"
dependencies: ["phase-01-branch-and-dependencies"]
---

# Phase 2: Real useChat Integration

## Overview

Wire `StudyChatPanel` to the official `@ai-sdk/react` `useChat` hook while preserving the current chat experience.

## Requirements

- Functional: Chat messages stream in the existing Study Studio panel, and each request includes the active passage id and content.
- Non-functional: Keep UI behavior and styling scoped to the existing component.

## Architecture

Use `DefaultChatTransport` from `ai` with API `/api/study-chat`. Pass `passageId` and `passageContent` using the v6 transport request body so the server can build a passage-grounded prompt.

## Related Code Files

- Modify: `src/app/(dashboard)/study/study-chat-panel.tsx`

## Implementation Steps

1. Import `DefaultChatTransport` from `ai`.
2. Replace the local-shim option shape with AI SDK v6 transport configuration.
3. Keep `sendMessage({ text })`, streaming status, stop handling, suggestions, and input reset behavior.
4. Adjust message text extraction only if official `UIMessage` types require it.

## Success Criteria

- [ ] Study Chat compiles with official `@ai-sdk/react`.
- [ ] Requests still include `passageId` and `passageContent`.
- [ ] Existing chat UI behavior remains intact.

## Risk Assessment

The official hook may require a different request body shape than the shim. Mitigate by using `DefaultChatTransport.prepareSendMessagesRequest` or `body` based on installed v6 types.
