---
phase: 7
title: "Ai-Chat Refactor"
status: pending
priority: P3
effort: "0.5h"
dependencies: ["phase-01-analysis"]
---

# Phase 7: Ai-Chat Refactor

## Overview

Refactor ai-chat feature từ nested sang flat structure.

## Current Files (2 files)

```
src/features/ai-chat/
├── lib/
│   └── chat-utils.ts
└── services/
    └── chat.service.ts
```

## Target Structure

```
src/features/ai-chat/
├── ai-chat.service.ts    ← Merge services/chat.service.ts
├── ai-chat.lib.ts        ← Merge lib/chat-utils.ts
├── hooks/               ← Unchanged
└── ui/                  ← Unchanged
```

## Note

ai-chat feature RẤT NHỎ - chỉ 2 files. Có thể merge đơn giản.

## Implementation Steps

1. [ ] Rename `services/chat.service.ts` → `ai-chat.service.ts`
2. [ ] Merge `lib/chat-utils.ts` → `ai-chat.lib.ts`
3. [ ] Update imports
4. [ ] Delete old files
5. [ ] Verify typecheck

## Files to Delete After Migration

```
src/features/ai-chat/
├── lib/chat-utils.ts    → merged into ai-chat.lib.ts
└── services/chat.service.ts → renamed to ai-chat.service.ts
```

## Success Criteria

- [ ] `ai-chat.service.ts` contains chat service
- [ ] `ai-chat.lib.ts` contains chat utilities
- [ ] All imports updated
- [ ] TypeScript compiles without errors
