---
phase: 1
title: Rename schema files to .schema.ts
status: completed
effort: ''
---

# Phase 1: Rename schema files to .schema.ts

## Overview

Rename 9 zod-schema files from `*-schema.ts` to `*.schema.ts` using `git mv` (preserves history),
then update every import specifier that points at them. Pure path change — file contents untouched.

## Rename Map

| From | To | Importers |
|------|----|-----------|
| `src/features/dictionary/schemas/dictionary-response-schema.ts` | `dictionary-response.schema.ts` | 12 |
| `src/features/vocabulary/model/vocabulary-response-schema.ts` | `vocabulary-response.schema.ts` | 7 |
| `src/features/studio-panel/schemas/study-response-schema.ts` | `study-response.schema.ts` | 5 |
| `src/features/studio-panel/schemas/chat-schema.ts` | `chat.schema.ts` | 3 |
| `src/features/learning-session/schemas/learning-session-response-schema.ts` | `learning-session-response.schema.ts` | 2 |
| `src/features/reading/schemas/translation-response-schema.ts` | `translation-response.schema.ts` | 2 |
| `src/features/upload/schemas/upload-response-schema.ts` | `upload-response.schema.ts` | 1 |
| `src/lib/http/api-response-schema.ts` | `api-response.schema.ts` | 5 |
| `src/lib/http/response-schema.ts` | `response.schema.ts` | 2 (incl. `api-response.schema.ts`) |

Note: `api-response-schema.ts` imports from `response-schema.ts`; update the intra-`lib/http` import too.
Do NOT touch `studio-artifact-types.ts`, `dictionary-helpers.ts`, `normalize-dictionary-term.ts`,
`text-utils.ts`, `translation-limits.ts`, `upload-validation.ts` — not schema files.

## Implementation Steps

1. For each row: `git mv <from> <to>`.
2. Update import specifiers. The module specifier is the path minus `.ts`, so replace the trailing
   `-schema` with `.schema` in every importer. Mechanical global replace per base name, e.g.:
   ```bash
   grep -rl 'dictionary-response-schema' src --include='*.ts' --include='*.tsx' \
     | xargs sed -i 's#dictionary-response-schema#dictionary-response.schema#g'
   ```
   Repeat for each base. For the `lib/http` pair, scope the replace so `api-response-schema` is
   handled before/independently of `response-schema` to avoid partial-substring collisions
   (`api-response-schema` contains `response-schema`). Replace the longer name first, or anchor on
   the full path segment.
3. Re-check for stragglers: `grep -rn -- '-response-schema\|/chat-schema\|/response-schema"\|api-response-schema' src` should return nothing.
4. `pnpm run typecheck` — must pass (proves all paths resolve).

## Risk / Watch-outs

- **Substring collision:** `api-response-schema` ⊃ `response-schema`. A naive `s#response-schema#response.schema#` would also mangle `api-response-schema` → `api-response.schema` (correct) but could double-apply. Do the `api-response-schema` → `api-response.schema` replace as its own anchored pass, then `response-schema` (now only the standalone file) separately. Verify with typecheck.
- The `schemas/` dir also holds non-schema files; the map above is the allowlist — rename only these 9.

## Success Criteria

- [ ] All 9 files renamed via `git mv` (history preserved).
- [ ] No remaining import references to the old `*-schema` specifiers (grep clean).
- [ ] `pnpm run typecheck` passes.
