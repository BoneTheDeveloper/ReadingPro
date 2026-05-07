# Code Review: Supabase Database Migration

**Scope**: Supabase auth integration, RLS policies, storage, DB connection config
**Files**: 10 reviewed
**Date**: 2026-05-07
**Branch**: feature/supabase-database (same commit as main: acf512e)

---

## Overall Assessment

Solid foundation. Auth flow, RLS policies, and storage isolation are architecturally correct. Service role key stays server-side, no fs/promises in upload path, pooled vs. direct connection separation exists. However, there are two critical findings and several high-priority items requiring attention before this ships to production.

---

## Critical Issues

### C1. `.env.example` leaks real Supabase project reference ID

**File**: `/home/luc/Project/english-reading-training-app/.env.example` lines 15-24

`.env.example` contains a real Supabase project ID (`jbehznovqxjxedqhthlk`) in `DB_USER`, `DB_HOST`, and `DIRECT_DB_HOST` fields. While passwords are placeholders, the project ID + pooler hostname + DB username pattern allows anyone to:
- Identify the Supabase project
- Attempt credential stuffing on the pooler endpoint
- Enumerate the DB user namespace

```
DB_HOST=aws-1-ap-northeast-1.pooler.supabase.com
DB_USER=postgres.jbehznovqxjxedqhthlk
DIRECT_DB_HOST=db.jbehznovqxjxedqhthlk.supabase.co
```

**Fix**: Replace with generic placeholders:
```
DB_HOST=aws-0-{region}.pooler.supabase.com
DB_USER=postgres.{your-project-ref}
DB_NAME=postgres
DIRECT_DB_HOST=db.{your-project-ref}.supabase.co
```

### C2. `PATCH /api/study-session` has no auth check -- any user can update any session

**File**: `/home/luc/Project/english-reading-training-app/src/app/api/study-session/route.ts` lines 37-68

The `POST` handler correctly calls `getAuthenticatedUser()` and binds `userId: user.id`. But the `PATCH` handler accepts `sessionId` from the request body and updates it directly with **no auth check**. An attacker can:
1. Enumerate session IDs (cuid is sequential-time-based, not cryptographically random)
2. Submit `PATCH` with any `sessionId` to tamper with another user's session data (accuracy rates, card counts)

```typescript
// PATCH handler -- NO getAuthenticatedUser() call
const { sessionId, cardsReviewed, ... } = await request.json();
const session = await db.studySession.update({
  where: { id: sessionId },  // attacker-controlled
  data: { ... }
});
```

**Fix**: Add auth check AND verify session ownership:
```typescript
export async function PATCH(request: NextRequest) {
  const user = await getAuthenticatedUser();
  const { sessionId, ... } = await request.json();

  // Verify ownership before update
  const existing = await db.studySession.findUnique({ where: { id: sessionId } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  // ... proceed with update
}
```

---

## High Priority

### H1. `POST /api/cards/review` -- no auth or ownership check on card review

**File**: `/home/luc/Project/english-reading-training-app/src/app/api/cards/review/route.ts`

Accepts `cardReviewId` from request body and updates it without verifying the caller owns that card review. Any authenticated user (or unauthenticated if the route isn't protected) can modify another user's SM-2 data, corrupting their spaced repetition schedule.

```typescript
const { cardReviewId, qualityRating } = await request.json();
const updatedReview = await updateCardReview(cardReviewId, qualityRating);
```

**Fix**: Add `getAuthenticatedUser()` and verify `cardReview.userId === user.id` before updating.

### H2. `POST /api/upload/text` -- no auth check

**File**: `/home/luc/Project/english-reading-training-app/src/app/api/upload/text/route.ts`

No `getAuthenticatedUser()` call. Delegates to `analyzeContentAction` which does call auth internally (line 77 of analyze.ts), so this is partially mitigated. However, the route still accepts and validates input before hitting the server action. If `analyzeContentAction`'s auth check ever regresses, this route becomes an open endpoint.

**Recommendation**: Add `getAuthenticatedUser()` at the route level for defense-in-depth.

### H3. `POST /api/upload` (file upload) -- no auth check at route level

**File**: `/home/luc/Project/english-reading-training-app/src/app/api/upload/route.ts`

Same pattern as H2. Auth is delegated to `analyzeContentAction`. The upload itself (file storage via `uploadFile`) runs before auth, meaning unauthenticated users can upload files to Supabase Storage even if passage creation fails.

**Impact**: Storage abuse -- unauthenticated users can fill the storage bucket.

**Fix**: Call `getAuthenticatedUser()` before `uploadFile()`.

### H4. `buildUrl()` duplicated 3 times with identical logic

**Files**:
- `/home/luc/Project/english-reading-training-app/prisma.config.ts` lines 6-17
- `/home/luc/Project/english-reading-training-app/src/lib/db/client.ts` lines 7-18
- `/home/luc/Project/english-reading-training-app/src/lib/db/connection-config.ts` lines 4-15

Three copies of the same `buildUrl()` function. The `connection-config.ts` version exports `getDatabaseUrl()` and `getDirectDatabaseUrl()` but neither is imported anywhere -- `client.ts` has its own copy.

**Fix**: Have `client.ts` import from `connection-config.ts`. Have `prisma.config.ts` use the direct URL variant. Remove dead code in `connection-config.ts` if unused, or adopt it as the single source of truth.

### H5. `dotenv` config() calls in server-only modules may mask missing env vars

**Files**:
- `src/lib/db/client.ts` line 5
- `src/lib/storage/supabase-storage.ts` line 2
- `src/lib/db/connection-config.ts` line 1

Next.js natively loads `.env.local` at build time. Calling `config({ path: '.env.local' })` in modules that run server-side is redundant. More concerning: if the `.env.local` file is missing in production (where env vars come from the hosting platform), `dotenv` silently does nothing and the non-null assertions (`!`) on `process.env.NEXT_PUBLIC_SUPABASE_URL!` etc. will fail with unhelpful errors.

**Fix**: Remove `dotenv` calls from these files. Validate required env vars at startup with explicit error messages.

---

## Medium Priority

### M1. RLS policies use nested subqueries instead of direct `supabaseAuthId` column

**File**: `/home/luc/Project/english-reading-training-app/supabase/migrations/enable_rls.sql`

Passages, card_reviews, and study_sessions policies use:
```sql
"userId" IN (SELECT id FROM users WHERE "supabaseAuthId" = (SELECT auth.jwt() ->> 'sub'))
```

This requires a JOIN/subquery per row check. Since these tables already have `userId` FK to `users`, and `users.supabaseAuthId` is unique, consider adding `supabaseAuthId` directly to these tables as a denormalized column for RLS. Alternatively, this works correctly as-is -- just noting the performance trade-off.

### M2. `upsert: false` in storage upload silently fails on filename collision

**File**: `/home/luc/Project/english-reading-training-app/src/lib/storage/supabase-storage.ts` line 22

The filename is `Date.now()-sanitizedName`. If two uploads happen within the same millisecond with the same file name, the second upload fails silently (returns null). Unlikely but possible under high concurrency.

**Recommendation**: Use `crypto.randomUUID()` prefix or add retry logic.

### M3. `getPublicUrl` on uploaded files -- no access control on storage bucket

**File**: `/home/luc/Project/english-reading-training-app/src/lib/storage/supabase-storage.ts` line 29

Uploads use `getPublicUrl()` making all uploaded files publicly accessible by URL. If the storage bucket is public (which it must be for this to work), any user who knows or guesses a filename can access any uploaded file.

**Recommendation**: Consider using signed URLs via `getSignedUrl()` for sensitive content, or set the bucket to private and use signed URLs for downloads.

### M4. RLS migration is not idempotent

**File**: `/home/luc/Project/english-reading-training-app/supabase/migrations/enable_rls.sql`

Running this migration twice will fail with "policy already exists" errors. No `CREATE OR REPLACE POLICY` or `DROP POLICY IF EXISTS` guards.

**Fix**: Add `DROP POLICY IF EXISTS` before each `CREATE POLICY`, or use `CREATE POLICY IF NOT EXISTS` (PostgreSQL 15+).

### M5. `StudySession` model missing `passage` relation

**File**: `/home/luc/Project/english-reading-training-app/prisma/schema.prisma` line 117

`StudySession` has `passageId` but no `@relation` to `Passage`. The `study-session/route.ts` creates sessions with `passageId` but never validates the passage exists or belongs to the user.

---

## Low Priority

### L1. `connection-config.ts` is dead code

Exports `getDatabaseUrl()` and `getDirectDatabaseUrl()` but nothing imports them. Either adopt or remove.

### L2. `createUser()` and `getOrCreateUser()` in `db/utils.ts` ignore `supabaseAuthId`

**File**: `/home/luc/Project/english-reading-training-app/src/lib/db/utils.ts` lines 136-146

These functions create users without setting `supabaseAuthId`. All user creation should go through `syncUserWithDatabase` in `auth-utils.ts`. These are likely legacy functions that should be removed or marked deprecated.

### L3. Error responses leak internal structure

Multiple routes return generic 500 errors (good), but the Sentry example route at `/api/sentry-example-api` intentionally throws unhandled exceptions. Verify this is disabled or removed in production.

---

## Positive Observations

- **Service role key isolation**: `SUPABASE_SERVICE_ROLE_KEY` only used in `supabase-storage.ts` (server-only module). Client-side Supabase client correctly uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` only.
- **No fs/promises in upload path**: Confirmed zero filesystem writes for file handling.
- **Pooled vs. direct connection split**: `DB_*` vars for runtime (pgBouncer pooled), `DIRECT_DB_*` for Prisma migrations. Correct architecture.
- **Auth pattern**: `getAuthenticatedUser()` via `requireAuth()` -> `getCurrentUser()` -> `syncUserWithDatabase()` is a solid chain. Single source of truth for auth.
- **RLS policy correctness**: All policies correctly use `auth.jwt() ->> 'sub'` for user isolation via `supabaseAuthId`.
- **`.env.local` properly gitignored**: Not tracked, never committed.
- **`analyzeContentAction` auth**: Correctly calls `getAuthenticatedUser()` before DB writes.

---

## Recommended Actions

| Priority | Action | Effort |
|----------|--------|--------|
| C1 | Sanitize `.env.example` -- replace real project ref with placeholders | 2 min |
| C2 | Add auth + ownership check to `PATCH /api/study-session` | 15 min |
| H1 | Add auth + ownership check to `POST /api/cards/review` | 15 min |
| H3 | Move auth check before `uploadFile()` in upload route | 10 min |
| H4 | Deduplicate `buildUrl()` -- use `connection-config.ts` as single source | 20 min |
| H5 | Remove redundant `dotenv` calls, add startup validation | 15 min |
| M4 | Make RLS migration idempotent | 10 min |
| M3 | Evaluate public vs. private storage bucket access model | design decision |

---

## Metrics

- Type Coverage: TypeScript strict (inferred from Prisma usage)
- Test Coverage: Not assessed (no test files reviewed)
- Linting Issues: Not assessed
- Auth-protected API routes: 4/7 (upload, upload/text, cards/review, study-session PATCH lack route-level auth)
- RLS policies: 10 policies across 5 tables (correct structure, non-idempotent)

---

## Unresolved Questions

1. Is the Supabase storage bucket (`content-uploads`) set to public or private? If public, is intentional file exposure acceptable?
2. Are the legacy `createUser()`/`getOrCreateUser()` in `db/utils.ts` still used anywhere, or can they be removed?
3. Is the `/api/sentry-example-api` route meant for production or should it be removed/gated?
4. Should `connection-config.ts` be adopted as the single source for DB URL construction, or is it planned for removal?
