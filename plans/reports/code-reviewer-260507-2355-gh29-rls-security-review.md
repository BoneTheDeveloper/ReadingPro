# Code Review: GH-29 — Security: RLS policies ineffective with direct DB connection

### Scope
- Files: 5 changed (+ `prisma/SECURITY.md` untracked)
- LOC: ~30 insertions, ~13 deletions
- Focus: Security hardening for filename sanitization and RLS documentation

### Overall Assessment

The changes are well-intentioned and correctly identify the core issue (Prisma bypasses RLS). The `sanitizeFilename` function is a meaningful improvement over the previous inline regex. However, there are two **critical** issues and one high-priority issue that need addressing before merge.

---

### Critical Issues

**C1. `sanitizeFilename` allows path traversal via backslash mid-string**

`/home/luc/Project/english-reading-training-app/src/lib/validation/upload.ts:58`

```typescript
if (sanitized.includes('..') || sanitized.startsWith('/') || sanitized.startsWith('\\')) {
```

The check only guards `startsWith('/')` and `startsWith('\\')`. A backslash **mid-string** passes through. On Windows or in certain Supabase Storage path handling, `foo\..\bar` could resolve upward. More importantly, the regex on line 57 already strips backslashes (`\` is not in `[a-zA-Z0-9._-]`), so `startsWith('\\')` is dead code -- the check never fires because `\` is already replaced by `_`.

The real gap: **`..` is checked but single `.` segments are not**. A filename like `....txt` passes (it contains `..` but the check is `includes('..')` which catches it -- actually this is fine). However, the deeper issue is that after sanitization, a name like `...hidden` becomes `...hidden` which passes the `..` check but is still a dotfile. Whether Supabase Storage treats dotfiles specially depends on the bucket config.

**Fix:** Add a check for the sanitized result being empty or consisting only of dots/underscores:
```typescript
if (!sanitized || /^[\._]+$/.test(sanitized)) {
  return { error: 'Invalid filename' };
}
```

**C2. `title` on line 74 is derived from raw `file.name` — injection vector to AI prompt and DB**

`/home/luc/Project/english-reading-training-app/src/app/api/upload/route.ts:74`

```typescript
const title = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
```

This only strips the extension and replaces underscores/hyphens with spaces. Characters like `<`, `>`, `"`, `'`, `&`, `{`, `}` pass through. The `title` flows into:
1. `analyzeContentAction` which stores it in the DB via Prisma (`passage.title`)
2. Potentially into AI prompts (CEFR detection, question generation)

While Supabase Storage path is now safe via `sanitizeFilename`, the `title` field is an uncontrolled input that reaches the database and AI prompts.

**Fix:** Sanitize `title` the same way or use a subset:
```typescript
const title = safeName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
// Or better, sanitize explicitly:
const rawTitle = file.name.replace(/\.[^/.]+$/, '');
const title = rawTitle.replace(/[^a-zA-Z0-9\s'-]/g, '').trim() || 'Untitled';
```

---

### High Priority

**H1. `sanitizeFilename` return type uses discriminated union but caller uses `typeof` check**

`/home/luc/Project/english-reading-training-app/src/lib/validation/upload.ts:53`

```typescript
export function sanitizeFilename(name: string): string | { error: string }
```

`/home/luc/Project/english-reading-training-app/src/app/api/upload/route.ts:32`

```typescript
if (typeof safeName === 'object') {
```

This works but is fragile. If someone adds another object return type, or if the function is refactored to return `null` on error, the `typeof` check silently breaks. A tagged union or a consistent `{ valid, value?, error? }` pattern matching `validateFile` would be more robust and consistent with the rest of the module.

**Recommendation:** Align with the existing `FileValidationResult` pattern:
```typescript
export function sanitizeFilename(name: string): { valid: true; sanitized: string } | { valid: false; error: string }
```

**H2. `.env.example` removed pooler config without migration guide**

`/home/luc/Project/english-reading-training-app/.env.example`

The pooler variables (`DB_HOST=aws-0-region.pooler.supabase.com`, `DB_PORT=6543`, `DB_USER=postgres.project-ref`) and direct connection variables were removed. Existing deployments using the pooler will have stale `.env` files that still work, but new developers get no guidance on whether to use pooler or direct connection.

The removal of `DIRECT_DB_*` vars is correct (Prisma should use direct connection, not pooler), but the `.env.example` should document the recommendation clearly.

**Fix:** Add a comment:
```bash
# Database (direct connection — Prisma requires non-pooled connection for migrations)
# For Supabase: use db.project-ref.supabase.co:5432, NOT the pooler endpoint
DB_HOST=your-db-host
```

---

### Medium Priority

**M1. Empty filename after sanitization not handled**

`/home/luc/Project/english-reading-training-app/src/lib/validation/upload.ts:57`

If a user uploads a file named `@@@`, the regex strips all characters producing an empty string `""`. The `..` and `/` checks pass (empty string contains neither). The resulting storage path becomes `{userId}/{timestamp}-` which is ugly but not dangerous. Still worth rejecting.

**M2. No filename uniqueness guarantee beyond millisecond timestamp**

`/home/luc/Project/english-reading-training-app/src/app/api/upload/route.ts:36-37`

```typescript
const timestamp = Date.now();
const filename = `${user.id}/${timestamp}-${safeName}`;
```

Two uploads from the same user within the same millisecond with the same filename will collide. `upsert: false` means the second silently fails (returns null). Low probability but worth noting. A UUID or `crypto.randomUUID()` suffix would eliminate this.

**M3. `analyzeContentAction` runs AI processing before auth check**

`/home/luc/Project/english-reading-training-app/src/app/actions/analyze.ts:77`

`getAuthenticatedUser()` is called at line 77, after AI calls (CEFR detection, simplification, question generation) have already executed at lines 31-75. An unauthenticated caller wastes AI tokens before being rejected. This is pre-existing, not introduced by this PR, but relevant to the security theme.

---

### Low Priority

**L1. `prisma/SECURITY.md` is untracked**

The file exists but was not included in the commit. It needs to be staged and committed.

**L2. RLS migration comment is good but could reference the specific auth function**

`/home/luc/Project/english-reading-training-app/supabase/migrations/enable_rls.sql`

The comment says "App-level auth (`requireAuth`)" but the actual function is `getAuthenticatedUser()` which wraps `requireAuth()`. Both names appear in code. Consider using the more specific reference.

---

### Positive Observations

- Correct identification that Prisma bypasses RLS -- the documentation in `prisma/SECURITY.md` is clear and actionable
- All API routes verified to call `getAuthenticatedUser()` before DB queries
- `sanitizeFilename` correctly uses allowlist regex (not blocklist) -- right approach
- Return type discriminated via `typeof` check is a reasonable first pass
- RLS is kept enabled as defense-in-depth, not removed

---

### Recommended Actions

1. **[Critical]** Fix `sanitizeFilename` to reject empty/all-dot filenames (C1)
2. **[Critical]** Sanitize `title` derived from `file.name` on line 74 (C2)
3. **[High]** Consider aligning `sanitizeFilename` return type with `FileValidationResult` pattern (H1)
4. **[High]** Add clarifying comment to `.env.example` about direct vs pooler connection (H2)
5. **[Medium]** Handle empty-string result from sanitization (M1)
6. **[Medium]** Stage `prisma/SECURITY.md` and include in commit (L1)

---

### Metrics
- Type Coverage: inferred (TypeScript strict mode)
- Test Coverage: unknown (no test files changed)
- Linting Issues: 0 (no syntax errors)

### Unresolved Questions

1. Is the Supabase Storage bucket configured as public? If so, are uploaded files intended to be publicly accessible by URL? (Noted in prior review `code-reviewer-260507-2020`)
2. Should `validateFile` also call `sanitizeFilename` internally to reject files with invalid names at the validation layer, rather than having two separate checks in the route handler?
