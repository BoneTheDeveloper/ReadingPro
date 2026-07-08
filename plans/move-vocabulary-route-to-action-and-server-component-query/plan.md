---
title: "Vocabulary Server Actions Migration"
description: "Migrate vocabulary API routes to Next.js Server Actions following the convention: reads in Server Components, writes via useActionState"
status: completed
priority: P2
branch: "preview"
tags: ["next.js", "server-actions", "refactor"]
blockedBy: []
blocks: []
created: "2026-07-08T07:12:15.064Z"
createdBy: "ck-cli"
source: cli
---

# Vocabulary Server Actions Migration

## Overview

Migrate vocabulary API routes to Next.js Server Actions following the app's data access convention:
- **Reads (queries)**: Direct service calls in Server Components at render time
- **Writes (mutations)**: Server Actions triggered from client via `useActionState`, followed by `revalidatePath`

## Scope

### Phase 1: Create Server Actions
- Create `src/features/vocabulary/actions.ts` (mutations only, "use server")
- Implement Server Actions for vocabulary items (save, delete, update status, review)
- Implement Server Actions for vocabulary sets (create, update, delete, add/remove items)
- Add Zod validation and revalidation

### Phase 2: Update Client Components
- Update `vocabulary-client.ts` to use Server Actions instead of fetch
- Update any components using `vocabulary-client.ts` functions

### Phase 3: Update Server Component Pages
- Migrate `GET /api/vocabulary/list` → Server Component direct call
- Migrate `GET /api/vocabulary/stats` → Server Component direct call
- Migrate `GET /api/vocabulary/sets` → Server Component direct call

### Phase 4: Remove Old API Routes
- Delete all `/api/vocabulary/*` routes
- No external clients currently

## API Routes to Migrate

| Route | Method | New Location | Type |
|-------|--------|-------------|------|
| `/api/vocabulary` | POST | Server Action | Write |
| `/api/vocabulary/[id]` | DELETE | Server Action | Write |
| `/api/vocabulary/[id]/status` | PATCH | Server Action | Write |
| `/api/vocabulary/[id]/review` | POST | Server Action | Write |
| `/api/vocabulary/sets` | POST | Server Action | Write |
| `/api/vocabulary/sets/[id]` | PATCH | Server Action | Write |
| `/api/vocabulary/sets/[id]` | DELETE | Server Action | Write |
| `/api/vocabulary/sets/[id]/items` | POST | Server Action | Write |
| `/api/vocabulary/sets/[id]/items/[itemId]` | DELETE | Server Action | Write |
| `/api/vocabulary/list` | GET | Server Component | Read |
| `/api/vocabulary/stats` | GET | Server Component | Read |
| `/api/vocabulary/sets` | GET | Server Component | Read |

## Dependencies

- Next.js 16.2.6 (Server Actions)
- React 19.2.6 (useActionState)

## Out of Scope

- Dictionary routes
- Upload routes
- Studio routes
- Webhook routes
- External API clients
