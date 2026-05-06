# Phase 1: Split Upload and Analysis (ENG-35)

**Priority:** Urgent | **Effort:** M | **Status:** pending
**Linear:** [ENG-35](https://linear.app/english-reading-app/issue/ENG-35)

## Context

Upload API routes currently mix file parsing with AI analysis. Two near-identical analysis actions exist (`analyzeContentAction` and `studyAnalyzeAction`). This creates a convoluted flow: file → `/api/upload` REST → get text → `studyAnalyzeAction`.

## Target Architecture

```
BEFORE:  /api/upload → parse file + AI analyze + save to DB → return results
AFTER:   /api/upload → parse file → return { text, title }
         client → studyAnalyzeAction({ text, title }) → AI pipeline → { passage, questions }
```

## Requirements

- `/api/upload` returns `{ text, title }` only (no AI calls)
- `/api/upload/text` returns `{ text, title }` only (no AI calls)
- Remove `analyzeContentAction` — only `studyAnalyzeAction` remains
- Client calls `studyAnalyzeAction` after getting text from upload endpoint
- Old `/upload` page still works (redirects to `/study` or uses same flow)

## Files to Modify

| File | Action |
|---|---|
| `src/app/api/upload/route.ts` | Strip analysis logic, return `{ text, title }` |
| `src/app/api/upload/text/route.ts` | Strip analysis logic, return `{ text, title }` |
| `src/app/actions/analyze.ts` | Remove `analyzeContentAction`, keep `studyAnalyzeAction` |
| `src/app/(dashboard)/study/study-left-panel.tsx` | Update upload handlers: upload → get text → call `studyAnalyzeAction` |
| `src/app/(dashboard)/study/study-page-client.tsx` | Update `handleAnalyze` to accept `{ text, title }` input |
| `src/app/(dashboard)/upload/page.tsx` | Redirect to `/study` or use new flow |

## Implementation Steps

### Step 1: Refactor `/api/upload/text/route.ts`
- Remove `analyzeContentAction` import and call
- After `validateTextContent`, return `{ success: true, data: { text, title: extractTitle(text) } }`
- Keep validation logic, remove all AI/DB code

### Step 2: Refactor `/api/upload/route.ts`
- Remove `analyzeContentAction` import and call
- After PDF parsing or text extraction, return `{ success: true, data: { text, title: filename } }`
- Keep file validation and PDF parsing, remove all AI/DB code

### Step 3: Clean up `analyze.ts`
- Delete `analyzeContentAction` function entirely
- Keep `studyAnalyzeAction` as the single analysis entry point
- Verify `studyAnalyzeAction` accepts `{ text, title }` input (it already does)

### Step 4: Update study page client flow
- `study-page-client.tsx`: `handleAnalyze` now takes `{ text, title }` instead of file
- `study-left-panel.tsx`:
  - File upload handler: POST to `/api/upload` → get `{ text, title }` → call `handleAnalyze({ text, title })`
  - Text paste handler: POST to `/api/upload/text` → get `{ text, title }` → call `handleAnalyze({ text, title })`
  - Remove any direct `studyAnalyzeAction` calls from upload handlers

### Step 5: Handle old `/upload` page
- Check if `/upload` page is still linked anywhere in the app
- If yes: redirect to `/study` or update to use new two-step flow
- If no: consider deleting or leaving as-is with a redirect

### Step 6: Verify
- `npm run build` passes
- File upload → text extraction → analysis → reading + questions flow works
- Text paste → validation → analysis → reading + questions flow works
- No duplicate code paths remain

## Acceptance Criteria

- [ ] `/api/upload` returns `{ text, title }` only (no AI calls)
- [ ] `/api/upload/text` returns `{ text, title }` only (no AI calls)
- [ ] `analyzeContentAction` removed, only `studyAnalyzeAction` exists
- [ ] Study page: upload → get text → `studyAnalyzeAction` → ready
- [ ] Old `/upload` page handled (redirect or updated)
- [ ] Build passes

## Risks

- Old `/upload` page callers may break — check nav links, breadcrumbs
- Response shape change may affect error handling in client — test both success and error paths
