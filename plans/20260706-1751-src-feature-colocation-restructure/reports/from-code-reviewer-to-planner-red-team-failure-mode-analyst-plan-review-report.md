# Red Team Report: Failure Mode Analysis
**Reviewer:** code-reviewer (Failure Mode Analyst / Flow Tracer)
**Plan:** `plans/20260706-1751-src-feature-colocation-restructure/plan.md`
**Date:** 2026-07-06

---

## Finding 1: Logger Re-export Does NOT Mask Import Changes During Phased Migration
- **Severity:** Critical
- **Location:** Phase 2, section "Architecture" and Phase 14, "Implementation Step 1"
- **Flaw:** The plan claims re-exports at `server/observability/logger.ts` will "mask" the 33 logger imports during migration, allowing gradual import updates. This is **backwards** — re-exports at the old path only work AFTER the new path exists. The plan creates `services/logger.ts` in phase 2, then makes `server/observability/logger.ts` a re-export. But all 33 consumers still import from `@/server/observability/logger` — which now re-exports from `services/logger`. This means **phase 2 itself already requires updating all 33 import paths**, not "later phases."
- **Failure scenario:** Phase 2 implementer creates `services/logger.ts` and converts `server/observability/logger.ts` to a re-export. TypeScript typecheck passes because all 33 consumers still resolve through the re-export. But this is a **false positive** — the actual import paths have NOT been updated. If a developer later deletes `services/logger.ts` to refactor, all 33 consumers break simultaneously. Or if phase 12's feature migration accidentally introduces a circular dependency or mismatched export shape, the error surfaces late in phase 12 instead of immediately in phase 2.
- **Evidence:** Plan says "KHÔNG được sửa tay 33 file import logger — giữ `server/observability/logger.ts` làm re-export" (Phase 2, Requirements). Grep confirms 33 imports exist: `src/app/api/upload/route.ts:7`, `src/server/ai/content-simplifier.ts:5`, `src/server/modules/ai-chat/chat-service.ts:8`, etc. Re-export pattern only guarantees paths resolve, NOT that the architectural goal (consolidate to single source) is achieved incrementally.
- **Suggested fix:** Either (a) update all 33 import paths in phase 2 itself (one-time cost, enables clean delete in phase 14), or (b) accept the re-export pattern but add a grep-based invariant check in phase 14: "grep `@/server/observability/logger` must return 0 results" — and this check will inevitably fail because the plan does NOT update the 33 paths.

---

## Finding 2: getNewCards Claimed "Dead Code" — No Consumer Verification in Plan
- **Severity:** High
- **Location:** Phase 8, section "Dead code xoá luôn" + Phase 4 (report.md mentions it as dead code)
- **Flaw:** Phase 8 claims `getNewCards` in passage-queries.ts is dead code (0 consumer). The plan never verifies this claim with a grep. I verified: `getNewCards` is defined at `src/server/db/passage-queries.ts:106` and grep confirms ZERO consumers in the codebase. However, Phase 4 (Progress feature) migrates `server/db/quiz/quiz-review.ts` — not `passage-queries.ts` — and Phase 8 deletes passage-queries.ts. **The deletion is gated on phase 8, but phase 4 is where progress is migrated. If `getNewCards` had hidden consumers in other feature migration phases (11, 12), they would only surface when phase 8 runs, potentially breaking already-migrated phases.**
- **Failure scenario:** Phase 4 migrates progress, Phase 8 migrates passage and deletes passage-queries.ts. If phase 11 or 12 accidentally imports `getNewCards` (which the plan doesn't foresee because it's "dead"), the deletion in phase 8 breaks phases 11-12 retroactively.
- **Evidence:** `grep -rn "getNewCards" src/` returns only the definition, no consumers. Plan's Phase 4 correctly identifies the migration source as `quiz-review.ts`, not `passage-queries.ts`. But Phase 8 "Delete" step doesn't list `getNewCards` verification as a required grep check before deletion.
- **Suggested fix:** Add grep verification step in Phase 8 before deleting passage-queries.ts: "grep `getNewCards` must return 0 results outside the definition itself." This confirms the dead-code claim before deletion.

---

## Finding 3: Phase 3 `route-errors.ts` Import Cycle Risk
- **Severity:** High
- **Location:** Phase 3, section "Architecture" (route-errors.ts) + Phase 2 dependency
- **Flaw:** Phase 3 creates `lib/http/route-errors.ts` which "import `AuthenticationRequiredError` từ `services/clerk`" (the phase 2 result). Phase 3 depends on Phase 2. But Phase 2 creates `services/clerk.ts` by copying `server/auth/auth-utils.ts` AND `server/auth/sync-user.ts`. The plan says: "If phase 2 gộp auth-utils + sync-user into 1 services/clerk.ts, phase 3 imports from services/clerk." **The plan never verifies whether `AuthenticationRequiredError` lives in auth-utils.ts or sync-user.ts.** If it lives in sync-user.ts and phase 2 splits them, phase 3's import from `services/clerk` may fail if the split is done wrong.
- **Failure scenario:** Phase 2 implementer splits auth-utils.ts and sync-user.ts into separate files. `AuthenticationRequiredError` is in sync-user.ts. Phase 3 tries `import { AuthenticationRequiredError } from "@/services/clerk"` but it's not exported there. Typecheck fails. Rollback required.
- **Evidence:** `src/server/auth/auth-utils.ts` and `src/server/auth/sync-user.ts` exist. Neither was read in the plan's verification steps. `AuthenticationRequiredError` could be in either file.
- **Suggested fix:** Phase 2 must verify where `AuthenticationRequiredError` is defined (grep before splitting), then ensure it ends up in `services/clerk.ts` as a named export. Phase 3 must verify the export exists before creating its dependency.

---

## Finding 4: Phase 14 Grep Gate is Insufficient — Re-export Cheats Mask Real Failures
- **Severity:** Critical
- **Location:** Phase 14, "Implementation Steps 1 and 1b" + plan overview invariant
- **Flaw:** Phase 14's success criteria requires: "grep `@/contracts/*` or `@/server/*` must return 0 results." But this grep runs AFTER all re-exports were created in phases 1-13. If a feature phase (e.g., phase 7 vocabulary) creates a re-export at `@/contracts/vocabulary/` pointing to `features/vocabulary/`, Phase 14's grep would still find `src/contracts/vocabulary/` exists — but it should have been deleted in phase 7. The grep is checking for leftover re-exports, NOT for whether the old directory was actually deleted on schedule.
- **Failure scenario:** Phase 7 deletes `contracts/vocabulary/` but creates a re-export at `server/modules/vocabulary/` (misplaced). Phase 14's grep checks for `@/contracts/vocabulary` (gone ✓) but NOT for misplaced re-exports. The `server/modules/vocabulary/` re-export survives to phase 14, then gets deleted, breaking any phase 8-13 code that still references it.
- **Evidence:** Phase 6 (Dictionary) says "Delete: `src/contracts/dictionary/`" and Phase 7 (Vocabulary) says "Delete: `src/contracts/vocabulary/`". Phase 14's grep only checks `@/contracts/*` and `@/server/*` imports — not whether the directories themselves still exist. Re-exports at the old paths would make imports pass while the old directories remain (with only re-export content).
- **Suggested fix:** Phase 14 must run TWO checks: (1) grep imports → 0 results for old paths, AND (2) grep directory existence → each old directory must not exist. Also add grep for `@/features/*` imports from within `app/` route handlers — route handlers should not directly import feature internal paths.

---

## Finding 5: Phase 5 Event-Driven Tracker — Passive Event Listeners May Miss Scroll in iOS
- **Severity:** Medium
- **Location:** Phase 5, section "Mô hình trigger mới" (trigger model)
- **Flaw:** Phase 5 specifies `scroll` event as passive: "đăng ký listener cho sự kiện định sẵn: `pointerdown`, `keydown`, `scroll` (passive)". On iOS Safari, passive scroll listeners cannot `preventDefault()`. While the tracker only needs to detect activity (not prevent), iOS Safari's "backdrop" scroll handling means the `scroll` event fires AFTER momentum scroll completes, not during. A user who reads a passage by scrolling (common on mobile) may have 5+ seconds of silence between `scroll` events.
- **Failure scenario:** User reads on iOS Safari, content-panel scrolls smoothly (momentum). The passive `scroll` listener only fires at the END of momentum. If the user pauses mid-scroll (e.g., to read a sentence), the event fires. But if the user scrolls continuously for 90 seconds, only 2-3 events fire. The throttle is 60 seconds. The tracker may miss the user's actual reading activity and not ping until the NEXT user action.
- **Evidence:** Plan Phase 5 acknowledges mobile viewport as a testing requirement ("test popup ở cả desktop + mobile viewport"). But the event list (`scroll` passive) is known to have timing issues on iOS.
- **Suggested fix:** Consider adding `touchstart` (passive) alongside `scroll`, OR use `visibilitychange` (fires on tab switch, which is a clear user intent signal), OR use `IntersectionObserver` to detect reading progress within the content panel as a fallback signal.

---

## Finding 6: Phase 7 normalizeDictionaryTerm Fix Depends on Phase 6 Migration Order
- **Severity:** High
- **Location:** Phase 7, section "Implementation Step 4" (normalizeDictionaryTerm fix)
- **Flaw:** Phase 7 says "đổi import trong `vocabulary-items.repository.ts` (đã move vào `features/vocabulary/db/`)" to point to `@/features/dictionary/schemas/normalize-dictionary-term`. But Phase 7 ALSO moves vocabulary-items.repository.ts from `server/modules/vocabulary/` to `features/vocabulary/db/`. The plan assumes Phase 6 has already moved `normalizeDictionaryTerm` to `features/dictionary/schemas/` and Phase 7 can import from there. **The plan does not verify this import path exists at the time Phase 7 runs.** Phase 6 depends on [1,2,3] and Phase 7 depends on [1,2,3,6]. So Phase 7 runs after Phase 6. Good. But Phase 7 moves vocabulary-items.repository.ts AND fixes the import in the same step. If Phase 6 failed to create the target path correctly, Phase 7's import fix breaks.
- **Failure scenario:** Phase 6 runs but creates `features/dictionary/schemas/normalize-dictionary-term.ts` with a different export name (e.g., `export const normalize = ...`). Phase 7 tries `import { normalizeDictionaryTerm } from "@/features/dictionary/schemas/normalize-dictionary-term"` but the export name doesn't match. Typecheck fails. Phase 7 is blocked.
- **Evidence:** Phase 6 Architecture says `schemas/normalize-dictionary-term.ts` (từ contracts/dictionary/). Phase 7 Implementation Step 4 assumes the export name `normalizeDictionaryTerm` is preserved. No explicit step in Phase 6 verifies export name preservation.
- **Suggested fix:** Add verification step in Phase 6: "grep `normalizeDictionaryTerm` in `features/dictionary/` must return the export definition." Or better: Phase 7 should use `grep` to verify the export exists before attempting to import it.

---

## Finding 7: Phase 8 chat-service.ts Import — Prisma Passage Direct Query Not Migrated
- **Severity:** High
- **Location:** Phase 12, "Related Code Files" (chat-service.ts)
- **Flaw:** Phase 12 says "chat-service.ts (đọc passage qua features/passage/db)" — implying Phase 12 will fix the direct `prisma.passage` call in chat-service. But Phase 8 (Passage entity) only migrates `passage-queries.ts`, `content-analysis.repository.ts`, `passage-study.repository.ts`. Chat-service is in `server/modules/ai-chat/`. The plan lists it as modified in Phase 12, not Phase 8. **Chat-service calls `prisma.passage.findUnique()` directly (grep confirmed: `src/server/modules/ai-chat/chat-service.ts:28`). Phase 8's invariant ("prisma.passage only called from features/passage/db/") will be violated until Phase 12 runs.**
- **Failure scenario:** Phase 8 completes, passes typecheck, and claims the prisma.passage invariant is satisfied. But `chat-service.ts` still calls `prisma.passage.findUnique()` directly. If Phase 12 is delayed or blocked, the invariant remains broken. The Phase 14 grep check would find `prisma.passage` in chat-service.ts.
- **Evidence:** `src/server/modules/ai-chat/chat-service.ts:28` has `const passage = await prisma.passage.findUnique({`. Plan Phase 12 lists chat-service.ts as modified, Phase 8 does not. This means the direct query persists through phases 9, 10, 11.
- **Suggested fix:** Either (a) move the chat-service passage query fix to Phase 8 itself (add chat-service to Phase 8's "Related Code Files"), OR (b) add an explicit Phase 11 check: "grep `prisma\.passage` outside `features/passage/db/` must return 0 results" — and this check will fail until Phase 12.

---

## Finding 8: Phase 11 reading feature — Inline Translate Cleanup Not Verified
- **Severity:** Medium
- **Location:** Phase 11, "Related Code Files" (delete list)
- **Flaw:** Phase 11 says to delete `server/modules/translation/` (toàn bộ, gồm dead code quick-selection-scope.ts). But `quick-selection-scope.ts` is verified dead code (grep shows 0 consumers). The plan doesn't verify that ALL other files in `server/modules/translation/` have been migrated before deletion. Specifically: `translation-provider.ts` — is it used by anything outside translation? If it IS used by studio or upload, deleting it in Phase 11 breaks those features.
- **Failure scenario:** Phase 11 deletes `server/modules/translation/` including `translation-provider.ts`. But Phase 12 (Studio) still references `translation-provider.ts` for some edge case. Typecheck fails in Phase 12.
- **Evidence:** Plan Phase 11 delete list includes "server/modules/translation/ (toàn bộ)" but does not verify each file's consumers first. Phase 11 depends on [1,2,3,6,8] and Phase 12 depends on [1,2,3,8,11]. So Phase 12 runs after Phase 11. If Phase 12 has a missed import from `translation-provider.ts`, it surfaces during Phase 12 testing.
- **Suggested fix:** Add verification step in Phase 11: "For each file in server/modules/translation/, grep consumers. All must be migrated or be the file being deleted."

---

## Finding 9: Phase 13 Study Page Compose — Type Hub Migration Order Is Fragile
- **Severity:** High
- **Location:** Phase 13, "Architecture" (type distribution) + Phase 8/11/12 type references
- **Flaw:** Phase 13 says the type hub `features/study/shared/types.ts` has 16 consumers. It distributes types to: passage (Phase 8), reading (Phase 11), studio (Phase 12), and glue (Phase 13). But the plan never verifies that Phases 8, 11, 12 actually created the re-exports that Phase 13's consumers depend on. If Phase 8 creates `PassageData` in `features/passage/schemas/` but Phase 13's study workspace still imports from `features/study/shared/types.ts` (re-export), Phase 13 must update ALL 16 consumer imports. **The plan claims phases 8/11/12 create re-exports, but Phase 13 doesn't verify they exist before trying to migrate consumers away from them.**
- **Failure scenario:** Phase 8 creates `features/passage/schemas/passage-types.ts` but does NOT create a re-export from `features/study/shared/types.ts`. Phase 13 tries to migrate study-workspace imports from `features/study/shared/types` to `features/passage/schemas` but the target doesn't have the expected exports. Multiple consumers fail simultaneously.
- **Evidence:** Plan Phase 8 "Modify" lists `features/study/shared/types.ts` (re-export passage types from chỗ mới). Plan Phase 13 "Modify" lists consumers of `features/study/shared/types`. Phase 13 depends on [4,5,6,7,8,9,10,11,12]. The assumption is phases 8/11/12 create re-exports that Phase 13 can migrate away from. But if Phase 8/11/12 only create the NEW types without re-exporting from the old location, Phase 13's migration is blocked.
- **Suggested fix:** Add verification in each of phases 8, 11, 12: "After migration, `features/study/shared/types.ts` must re-export all types that are now in the feature schemas." This ensures Phase 13 always has a valid path to migrate from.

---

## Finding 10: No Rollback Plan for Mid-Execution Failure
- **Severity:** Medium
- **Location:** Plan overview + Risk Assessment sections (each phase)
- **Flaw:** Each phase says "Rollback: revert re-export" as the rollback strategy. But if Phase 7 (vocabulary, P1 priority, highest risk) fails mid-execution — say the spaced-repetition scheduler import is broken and 3 weeks of vocabulary review data is at risk — the rollback procedure is not documented. "Revert re-export" is trivial for phases 1-3 (file creation), but for phases 4-13 (file moves + content changes), rollback requires: (1) reverting the new feature directory, (2) restoring the old directories, (3) restoring the modified consumer imports. This is non-trivial and may introduce new bugs.
- **Failure scenario:** Execution stops at Phase 7 due to a complex import cycle. The implementer must rollback Phase 7 but the rollback procedure is underspecified. They restore the old `contracts/vocabulary/` and `server/modules/vocabulary/` directories, but the Phase 7 changes to `vocabulary-items.repository.ts` (normalizeDictionaryTerm fix) are NOT in the old directory. Rollback is partial. App is in inconsistent state.
- **Evidence:** No rollback procedure documented beyond "revert re-export." Phases 4-13 involve actual file moves (not just re-exports), requiring a git-based rollback strategy that is not specified.
- **Suggested fix:** Document the rollback strategy: "If a phase fails, `git checkout HEAD~{N}` to the commit before the failed phase's changes. Re-run from the failed phase." This requires each phase to be in its own git commit (which the plan implies but doesn't mandate).

---

**Status:** DONE_WITH_CONCERNS
**Summary:** 10 failure mode findings identified. Critical issues: (1) logger re-export strategy masks rather than fixes the 33-path migration, (2) Phase 14 grep gate is insufficient to catch re-export cheats and misplaced re-exports, (3) chat-service.ts prisma.passage call persists through phases 9-11. High issues: (4) Phase 3 import cycle risk, (5) Phase 7 normalizeDictionaryTerm import dependency, (6) Phase 13 type hub migration fragility. Medium issues: (7) iOS scroll passive listener timing, (8) Phase 11 translation module cleanup verification, (9) no rollback procedure.
**Concerns:** The plan's phased approach is sound architecturally, but the re-export-as-scaffolding strategy creates latent defects that only surface at Phase 14. The Phase 14 grep check is the only safety net, but it's checking too late and checking the wrong thing.
