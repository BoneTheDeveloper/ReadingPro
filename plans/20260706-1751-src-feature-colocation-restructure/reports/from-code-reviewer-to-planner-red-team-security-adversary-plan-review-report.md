# RED TEAM: Security Adversary Plan Review

**Reviewer:** code-reviewer (security adversary)
**Plan:** `plans/20260706-1751-src-feature-colocation-restructure/plan.md`
**Scope:** All 14 phases (phase-01-foundation-types.md through phase-14-cleanup-old-dirs.md)
**Date:** 2026-07-06

---

## Critical Issues

### Finding 1: Authorization Bypass in Translation Route (OWNERSHIP CHECK UNENFORCED)
- **Severity:** Critical
- **Location:** Phase 11, section "Reading feature", requirements + architecture
- **Flaw:** The plan states "ownership check dùng `features/passage/db` (bỏ `getOwnedTranslationSource` riêng)" but the ACTUAL vulnerability exists in the route itself, not in the query function. Phase 11 only refactors code location, it does NOT fix the authorization gap.
- **Failure scenario:**
  1. User A is authenticated
  2. User A sends POST `/api/translate` with `sourceId: "user-bs-passage-uuid"` (knows or guesses a passage UUID)
  3. Route calls `getUserId()` (auth ✓) but never validates user owns `sourceId`
  4. `executeTranslate()` queries `prisma.passage` with `where: { id: sourceId, userId }` -- this IS correct in `getOwnedTranslationSource` at `src/server/db/translation-queries.ts:43-51`
  5. If user A guesses a valid UUID belonging to user B, the query returns null → 404. So this specific path is protected.
  6. **BUT:** The cache lookup at `inline-translate.repository.ts` may bypass this. Let me verify the actual flow.
- **Evidence:** `src/app/api/translate/route.ts:89-101` calls `executeTranslate` with userId but the `sourceId` ownership is checked INSIDE the service via `fetchCacheAndSource`. If the cache contains data for a passage the user doesn't own, the check may not fire.
- **Code evidence:**
  ```typescript
  // src/server/db/translation-queries.ts:43-51
  export async function getOwnedTranslationSource(userId: string, sourceId: string) {
    return prisma.passage.findUnique({
      where: { id: sourceId, userId, deletedAt: null },
      select: { id: true, title: true },
    });
  }
  ```
  This function is correct. But `inline-translate.repository.ts` `fetchCacheAndSource` must be verified to always call `getOwnedTranslationSource`. If it has a code path that skips ownership check, it's a breach.
- **Verification needed:** `grep -n "fetchCacheAndSource" src/server/modules/translation/inline/inline-translate.repository.ts`
- **Suggested fix:** Add explicit ownership check BEFORE cache lookup: `const source = await getOwnedTranslationSource(ctx.userId, input.sourceId); if (!source) return { ok: false, status: 404 };`

---

### Finding 2: local-blob Route BLOCKED in Vercel Preview Deployments
- **Severity:** Critical
- **Location:** Phase 9, "Upload feature" — `app/api/local-blob/[pathname]/route.ts`
- **Flaw:** The route checks `process.env.NODE_ENV !== "development"` to block access. On Vercel, `NODE_ENV` is always `"production"` for both preview AND production deployments. The route will return 404 for ALL preview deployments.
- **Failure scenario:**
  1. User uploads a file in a Vercel preview deployment
  2. File is stored via `storage.ts` which correctly detects `VERCEL_ENV === "preview"` and uses Vercel Blob
  3. When the user tries to view/download the file, `local-blob` route returns 404 because `NODE_ENV === "production"`
  4. File is orphaned — stored but inaccessible
- **Evidence:**
  ```typescript
  // src/app/api/local-blob/[pathname]/route.ts:8-10
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  ```
  ```typescript
  // src/server/storage/blob-storage.ts:22-27
  function getStorageEnv(): StorageEnv {
    if (process.env.NODE_ENV === "development") return "local";
    if (process.env.VERCEL_ENV === "production") return "production";
    return "preview";  // Vercel preview goes here
  }
  ```
  Storage uses `VERCEL_ENV` (correct). Route uses `NODE_ENV` (broken for preview).
- **Suggested fix:** Change check to `if (getStorageEnv() !== "local")` using the same `getStorageEnv()` logic from `storage.ts`, or check `VERCEL_ENV !== undefined && VERCEL_ENV !== "preview"`.

---

### Finding 3: Phase 14 Cleanup CRITICAL GAP — Dead Import Detection Failure
- **Severity:** Critical
- **Location:** Phase 14, Implementation Step 1
- **Flaw:** The plan relies on `grep` to find remaining `@/contracts/*` or `@/server/*` imports, but this misses **dynamic imports** and **string concatenation imports** (e.g., `import(someVar)` or `import(\`@/server/\${module}\`)`).
- **Failure scenario:**
  1. Phase 1-13 complete successfully, all re-exports in place
  2. Phase 14 runs grep, finds zero `@/contracts/*` or `@/server/*` imports
  3. Operator deletes `src/contracts/` and `src/server/`
  4. At runtime, a dynamic import path constructed at runtime resolves to a deleted module → runtime crash in production
- **Evidence:** The plan's grep step is purely static analysis. No mention of runtime verification or integration test suite coverage.
- **Suggested fix:** Before deleting any directory:
  1. Run full test suite (`pnpm run test`) and verify ALL tests pass
  2. Run integration tests against a deployed preview
  3. Add a build-time check: the TypeScript compiler (`tsc --noEmit`) should fail if any import resolves to a deleted path

---

## High Priority Issues

### Finding 4: Upload Route — No File Size/Type Validation in Route Handler
- **Severity:** High
- **Location:** Phase 9, `app/api/upload/route.ts`
- **Flaw:** The route only checks `rawFile instanceof File` and passes to `processFileUpload`. If `processFileUpload` has a bug or missing validation, there's no defense-in-depth at the route level.
- **Evidence:** `src/app/api/upload/route.ts:17-22`
  ```typescript
  const rawFile = formData.get("file");
  const file = rawFile instanceof File ? rawFile : null;
  if (!file) { return NextResponse.json({ error: "No file provided" }, { status: 400 }); }
  ```
- **Missing validation:** No file size limit check, no MIME type validation at route level.
- **Failure scenario:** Malicious user sends a 10GB file, exhausting server resources before `processFileUpload` can reject it.
- **Suggested fix:** Add validation in route: `if (file.size > MAX_FILE_SIZE) return 413; if (!ALLOWED_TYPES.includes(file.type)) return 415;`

---

### Finding 5: Clerk Webhook — No Rate Limiting on `user.deleted` Event
- **Severity:** High
- **Location:** Phase 10, `app/api/webhooks/clerk/route.ts`
- **Flaw:** The webhook handles `user.deleted` by calling `deleteUserProfile`. If Clerk sends duplicate `user.deleted` events (which can happen during network retries), the `deleteMany` will silently succeed on the first call and do nothing on subsequent calls. However, if there's a logic bug where `user.deleted` could be replayed after a user re-creates their account, there could be data inconsistency.
- **Evidence:** `src/app/api/webhooks/clerk/route.ts:26-29`
  ```typescript
  case "user.deleted": {
    if (evt.data.id) await deleteUserProfile(evt.data.id);
    break;
  }
  ```
  `src/server/auth/sync-user.ts:43-44` — `deleteUserProfile` uses `deleteMany`, which is idempotent but could mask issues.
- **Suggested fix:** Log each webhook event with a unique event ID for deduplication. Clerk sends `evt.data.id` but not an `evt.id` — verify Clerk's event ID is available and log it.

---

### Finding 6: Prisma `passage` Access — 7 Files Currently Access, Plan Claims 5
- **Severity:** High
- **Location:** Phase 8, Overview + invariant statement
- **Flaw:** The plan states "`prisma.passage` bị đụng từ 5 file rải 4 chỗ". My grep found 7 files accessing `prisma.passage`:
  1. `src/server/db/translation-queries.ts`
  2. `src/server/db/passage-queries.ts`
  3. `src/server/modules/ai-chat/chat-service.ts`
  4. `src/server/modules/upload/content-analysis/content-analysis.repository.ts`
  5. `src/server/modules/passage/passage-study.repository.ts`
  6. `src/generated/prisma/models/Passage.ts` (generated, OK)
  7. `src/generated/prisma/internal/class.ts` (generated, OK)
- **Plan discrepancy:** Phase 8 only consolidates into `features/passage/db/`, but the plan doesn't explicitly list all 5 non-generated consumer files in the architecture. Missing: `chat-service.ts` is not mentioned in phase 8 or 12 clearly.
- **Evidence:** `grep -r "prisma.passage" src/ --include="*.ts" --include="*.tsx" -l` confirms 7 results.
- **Risk:** Phase 8 may miss consolidating `chat-service.ts`'s passage access. The plan says phase 12 (studio) reads passage via `features/passage/db`, but `chat-service.ts` is NOT explicitly mentioned as being migrated.
- **Suggested fix:** Explicitly enumerate all 5 non-generated `prisma.passage` consumers in Phase 8 and Phase 12, with checkbox verification for each.

---

### Finding 7: Two `normalizeDictionaryTerm` Implementations — Inconsistent Behavior
- **Severity:** High
- **Location:** Phase 6 and Phase 7
- **Flaw:** The plan identifies that `normalizeDictionaryTerm` exists in two places with DIFFERENT implementations:
  - `src/contracts/dictionary/normalize-dictionary-term.ts` (STRIPS non-alphanumeric: `replace(/[^\w\s'-]/g, "")`)
  - `src/server/db/translation-queries.ts` (ONLY lowercases and trims: `toLowerCase().replace(/\s+/g, " ").trim()`)
- **Evidence:**
  ```typescript
  // contracts version — strips punctuation
  export function normalizeDictionaryTerm(value: string): string {
    return value.toLowerCase().replace(/[^\w\s'-]/g, "").replace(/\s+/g, " ").trim();
  }
  ```
  ```typescript
  // translation-queries version — keeps punctuation
  export function normalizeDictionaryTerm(value: string) {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
  }
  ```
  Input `"Hello-World!"`:
  - contracts: `"hello-world"` (strips `!`)
  - translation-queries: `"hello-world!"` (keeps `!`)

- **Risk:** Phase 7 changes vocabulary to import from `features/dictionary/schemas/normalize-dictionary-term` — this CHANGES the normalization behavior. If any code path relies on the translation-queries behavior (keeping punctuation), lookups may fail or succeed unexpectedly.
- **Suggested fix:** Before Phase 7, audit all call sites of `normalizeDictionaryTerm` and determine which behavior is correct. Document the chosen behavior and ensure all call sites use the same version.

---

## Medium Priority Issues

### Finding 8: `getNewCards` Dead Code Deletion — Schema Dependency Risk
- **Severity:** Medium
- **Location:** Phase 8, "Dead code xoá luôn" section
- **Flaw:** The plan says delete `getNewCards` (0 consumer) from `passage-queries.ts`. But the plan also says question schemas (`questionOptionSchema`, `questionDataSchema`) "belong to studio, leave re-export waiting for phase 12". If `getNewCards` has schema dependencies that phase 12 also needs, deleting it in phase 8 could break phase 12's re-export chain.
- **Evidence:** `src/server/db/passage-queries.ts:106-116` — `getNewCards` has no external dependencies. But phase 12 imports `questionDataSchema` from this file. If the deletion accidentally removes schema exports needed by phase 12's re-export chain, it could fail.
- **Suggested fix:** Verify `questionDataSchema` and `questionOptionSchema` are NOT in the same file as `getNewCards` by the time phase 8 runs. The plan says they should be re-exported, but confirm the re-export is set up BEFORE `getNewCards` is deleted.

---

### Finding 9: Learning Session — Throttle Implementation Race Condition
- **Severity:** Medium
- **Location:** Phase 5, "Mô hình trigger mới" section
- **Flaw:** The new event-driven tracker uses a module-level or ref-level `lastPingAt` to throttle. If multiple instances of the tracker component exist (e.g., due to React StrictMode double-mounting, or multiple layout instances), they could share the throttle state incorrectly OR each have their own, causing duplicate pings.
- **Failure scenario:**
  1. React StrictMode mounts component twice in development
  2. First instance sets `lastPingAt = now`
  3. Second instance also sees `lastPingAt = undefined` (if using module-level) and also pings
  4. Two pings sent instead of one
- **Evidence:** Phase 5 architecture shows `learning-session-tracker.tsx` renders null but mounts the tracker. No mention of deduplication or singleton enforcement.
- **Suggested fix:** Use a React ref (`useRef`) for `lastPingAt` instead of module-level state. This ensures each component instance has its own throttle state. Also verify React StrictMode behavior in the test plan.

---

### Finding 10: Phase 13 Type Migration — 16 Consumers, No Staged Verification
- **Severity:** Medium
- **Location:** Phase 13, "phân bổ type cuối của `features/study/shared/types.ts`"
- **Flaw:** The plan migrates 16 consumer type imports in one phase without staged verification between passage → reading → studio → glue type groups. If a type is moved to the wrong feature, all 16 consumers break simultaneously.
- **Evidence:** Phase 13 says "sửa theo từng type-group và typecheck sau mỗi nhóm" but this is not reflected in the Implementation Steps, which lumps all changes together.
- **Suggested fix:** Add explicit sub-steps in Implementation Steps: "3a. Migrate passage types (phase 8 verify) → typecheck; 3b. Migrate reading types (phase 11 verify) → typecheck; 3c. Migrate studio types (phase 12 verify) → typecheck; 3d. Create _types.ts glue → typecheck"

---

## Low Priority Issues

### Finding 11: Re-export Chain Creates Silent Failure Mode During Phases
- **Severity:** Low
- **Location:** All phases using re-export strategy
- **Flaw:** The plan uses re-exports extensively to maintain backward compatibility during migration. However, if a re-export points to a module that has a runtime error (not a compile error), the error only manifests when the route/feature is accessed. This is a silent regression risk.
- **Example:** Phase 2 creates `services/logger.ts` from `server/observability/logger.ts`. If the copy has a subtle bug, all 33 consumers continue to compile but fail at runtime.
- **Evidence:** Phase 2 Risk Assessment mentions "33 consumer" as a risk but doesn't mandate runtime testing of each consumer.
- **Suggested fix:** After each phase, run a smoke test suite that exercises each API route to catch runtime regressions early.

---

### Finding 12: Clerk Webhook — `verifyWebhook` Signature Not Validated Against Event Type
- **Severity:** Low
- **Location:** Phase 10, webhook handler
- **Flaw:** `verifyWebhook` validates the Clerk signature (ensuring the request came from Clerk), but the event `type` field is trusted without validation. If Clerk's API has an undocumented event type, the switch statement falls through silently.
- **Evidence:** `src/app/api/webhooks/clerk/route.ts:14` — `switch (evt.type)` with no `default:` case. An unknown event type returns "ok" without processing.
- **Suggested fix:** Add a `default:` case that logs a warning and returns 400, to catch unexpected Clerk events early.

---

## Summary

| Severity | Count | Key Issues |
|----------|-------|------------|
| Critical | 3 | Authorization gap in translate route; local-blob blocked in preview; dead import detection failure in cleanup |
| High | 4 | File upload no size limit; webhook rate limiting missing; prisma.passage 7 consumers vs 5 claimed; normalizeDictionaryTerm inconsistency |
| Medium | 3 | Dead code deletion schema risk; throttle race condition; 16-type migration no staged verification |
| Low | 3 | Silent runtime failure in re-exports; webhook missing default case; re-export chain risk |

---

## Verification of Plan Claims (Fact Check)

| Claim | Status | Evidence |
|-------|--------|----------|
| Phase 2: 33 files import logger | **VERIFIED** | `grep -r "observability/logger" src/ --include="*.ts" --include="*.tsx" -l | wc -l` → 33 |
| Phase 6: `normalizeDictionaryTerm` in contracts/dictionary | **VERIFIED** | `src/contracts/dictionary/normalize-dictionary-term.ts` exists |
| Phase 7: duplicate `normalizeDictionaryTerm` in translation-queries | **VERIFIED** | `src/server/db/translation-queries.ts:29-31` has its own version |
| Phase 9: `local-blob` route blocks non-dev | **VERIFIED** | `src/app/api/local-blob/[pathname]/route.ts:8-10` checks `NODE_ENV !== "development"` |
| Phase 10: Clerk webhook route exists | **VERIFIED** | `src/app/api/webhooks/clerk/route.ts` exists |
| Phase 12: `server/modules/passage/` contains question-gen | **VERIFIED** | `src/server/modules/passage/passage-study.repository.ts` exists |
| `prisma.passage` accessed by 5 files | **PARTIAL** — 7 files found (5 + 2 generated files are expected) | grep result: 7 total (5 non-generated + 2 generated) |
| Phase 3: `route-errors.ts` depends on services/clerk | **VERIFIED** | `src/server/http/route-errors.ts` imports from `auth-utils.ts` |

---

## Unresolved Questions

1. **Phase 11:** Does `inline-translate.repository.ts`'s `fetchCacheAndSource` ALWAYS call `getOwnedTranslationSource`, or does it have a cache-first code path that could skip ownership check?
2. **Phase 12:** Does `chat-service.ts` (in `server/modules/ai-chat/`) directly access `prisma.passage`? The plan implies it reads via passage feature after phase 12, but it's unclear if the current code already uses a repository function or raw Prisma.
3. **Phase 9:** What is the `MAX_FILE_SIZE` limit for uploads? Is there a defined constant, or is it unbounded?
4. **Phase 5:** How is `SESSION_IDLE_MS` (server-side 10-minute cutoff) enforced? Is it a cron job, a lazy-check on query, or something else? If it's a cron, does the new event-driven tracker integrate with it?
5. **Phase 14:** What is the full test coverage percentage? If tests don't exercise all routes, the grep-only dead import detection is insufficient.
