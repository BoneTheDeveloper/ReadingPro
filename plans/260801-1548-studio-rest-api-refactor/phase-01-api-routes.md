# Phase 1: API Routes

## Context
Creating REST API routes for studio artifacts following CLAUDE.md conventions.

## Steps

### 1.1 Create artifact schema
- File: `src/features/studio/schemas.ts` (or extend existing)
- `ArtifactResponseSchema` - full artifact with type discriminator
- `CreateQuestionInputSchema` - `{ passageId: string }`
- `RecordProgressInputSchema` - from existing question schema

### 1.2 Create GET /api/artifact?passageId=
- Route: `src/app/api/artifact/route.ts`
- Handler: `listArtifacts(passageId)` → returns artifact metadata array
- Auth: requireApiSession session

### 1.3 Create GET /api/artifact/[id]
- Route: `src/app/api/artifact/[id]/route.ts`
- Handler: `getArtifact(id)` → returns full artifact with content
- Auth: requireApiSession session
- Returns: `{ id, passageId, type, content, progress, createdAt }`

### 1.4 Create POST /api/artifact/question
- Route: `src/app/api/artifact/question/route.ts`
- Handler: triggers AI question generation
- Input: `{ passageId }` (client generates artifactId)
- Auth: requireApiSession session
- Returns: created artifact with content

### 1.5 Create PATCH /api/artifact/[id]/progress
- Route: `src/app/api/artifact/[id]/progress/route.ts`
- Handler: updates progress
- Input: QuestionProgress

### 1.6 Create DELETE /api/artifact/[id]
- Route: `src/app/api/artifact/[id]/route.ts`
- Handler: deletes artifact
- Auth: requireApiSession session

## Files
- `src/app/api/artifact/route.ts` - list (GET)
- `src/app/api/artifact/[id]/route.ts` - get/delete (GET/DELETE)
- `src/app/api/artifact/question/route.ts` - create question (POST)
- `src/app/api/artifact/[id]/progress/route.ts` - update progress (PATCH)

## Validation
- Manual test each endpoint with curl
- TypeScript compiles without errors
