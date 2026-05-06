---
title: "Phase 04: Atomic Question Replacement"
description: "Wrap deleteMany + createMany in Prisma $transaction to prevent data loss on failure"
status: pending
priority: P1
effort: 0.5h
branch: main
tags: [data-integrity]
created: 2026-05-06
---

## Overview

Fix H5: `deleteMany` + `createMany` not atomic. If `createMany` fails after `deleteMany`, all questions are lost.

## Problem

**File:** `src/app/actions/study-generate-questions-action.ts:60-75`

```typescript
// Current: two separate operations
await db.question.deleteMany({ where: { passageId } });
await db.question.createMany({ data: ... });
```

If `createMany` throws (DB error, validation, network), existing questions are already deleted. User loses all questions with no recovery path.

## Fix

Wrap in Prisma `$transaction` (interactive transaction works on SQLite):

```typescript
await db.$transaction(async (tx) => {
  await tx.question.deleteMany({ where: { passageId } });
  await tx.question.createMany({ data: ... });
});
```

If `createMany` fails, the entire transaction rolls back. `deleteMany` is reverted. Existing questions survive.

## Files to Modify

- `src/app/actions/study-generate-questions-action.ts` -- wrap lines 60-75 in `$transaction`

## Implementation Steps

1. Locate the `deleteMany` + `createMany` block (lines 60-75)
2. Wrap in `db.$transaction(async (tx) => { ... })`
3. Replace `db.question` calls with `tx.question` inside transaction
4. Move the transaction inside the existing `Sentry.startSpan` wrapper

## Todo List

- [ ] Wrap `deleteMany` + `createMany` in `db.$transaction`
- [ ] Replace `db.question` with `tx.question` inside transaction callback
- [ ] Verify error handling still returns `{ error: '...' }` on transaction failure

## Success Criteria

- Question replacement is atomic -- no partial state possible
- Transaction failure returns error to client without data loss
- Existing Sentry span wrapping preserved
