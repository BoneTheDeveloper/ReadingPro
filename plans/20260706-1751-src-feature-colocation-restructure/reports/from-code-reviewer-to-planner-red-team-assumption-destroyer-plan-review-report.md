# Code Review: Assumption Destroyer Report
## Plan: src Feature-Colocation Restructure

**Scope Auditor Focus:** State additions, lifetime boundaries, shared state instantiation sites.

---

## Finding 1: Phase 3 Creates `src/lib/` Non-Existent Directory
- **Severity:** High
- **Location:** Phase 3, "Architecture" section
- **Flaw:** Phase 3 declares it will create `src/lib/prisma.ts` and `src/lib/http/` but `src/lib/` does not currently exist in the codebase. The plan assumes the directory exists or will be created silently.
- **Failure scenario:** Implementation fails at step 2-4 because `src/lib/http/response-schema.ts` cannot be written to a non-existent directory. `mkdir -p` is implied but not specified.
- **Evidence:**
  - `src/lib/` directory does not exist (confirmed by `ls /home/luc/Project/english-reading-training-app/src/lib/` → error)
  - Only `src/app`, `src/components`, `src/contracts`, `src/features`, `src/generated`, `src/i18n`, `src/server` exist
- **Suggested fix:** Add explicit step "mkdir -p src/lib/http" before creating files, or use a tool that auto-creates directories.

---

## Finding 2: Phase 3 Destination Conflict with Phase 2
- **Severity:** Critical
- **Location:** Phase 2 "Architecture" vs Phase 3 "Architecture"
- **Flaw:** Phase 2 creates `src/services/logger.ts` from `server/observability/logger.ts` and re-exports FROM the old path. Phase 3 creates `src/lib/http/route-errors.ts` from `server/http/route-errors.ts` and re-exports FROM the old path. Both phases create files in directories that don't exist yet AND create re-exports at the old location. The plan has no explicit ordering guarantee that Phase 2's re-export exists before Phase 3's new file creation.
- **Failure scenario:** If Phase 3 runs before Phase 2's re-export is stable, or if the re-export syntax differs between phases, typecheck fails. The plan says "phases run sequentially 1→14" but the implementation steps for each phase don't cross-check the other's state.
- **Evidence:** Phase 2 step 36: "Thay nội dung file gốc bằng re-export". Phase 3 step 5: same pattern. Both re-export from old → new, creating circular-looking path chains.
- **Suggested fix:** Add pre-flight check at start of each phase: "grep re-export in old path confirms it points to new path."

---

## Finding 3: Phase 4 Deletes `server/db/quiz/quiz-review.ts` Without Verifying Other Consumers
- **Severity:** Critical
- **Location:** Phase 4, "Related Code Files" → "Delete"
- **Flaw:** Phase 4 plan says "Delete: `src/server/db/quiz/quiz-review.ts` (sau khi 2 consumer đã trỏ chỗ mới)". It identifies 2 consumers (`app/api/progress/stats/route.ts` and `app/[locale]/page.tsx`) but does not grep the full codebase for OTHER consumers of `quiz-review.ts` or its exports.
- **Failure scenario:** A third consumer (not caught in planning) imports `quiz-review.ts` and silently breaks at runtime after deletion. The plan assumes only 2 consumers exist.
- **Evidence:**
  ```bash
  # Only plan mentions 2 consumers — no grep verification step in Phase 4
  # Step 39 skips grep verification for quiz-review.ts, only verifies contracts/learning-session
  ```
- **Suggested fix:** Add explicit grep step before deletion: "grep -r 'quiz-review' src/ --include='*.ts'" to enumerate ALL consumers.

---

## Finding 4: Phase 5 — Behavioral Change Without Canary/Rollback Strategy
- **Severity:** High
- **Location:** Phase 5, "Risk Assessment" and "Implementation Steps"
- **Flaw:** Phase 5 is a behavioral refactor (event-driven heartbeat), not just file moves. The plan relies solely on "test kỹ network tab" and manual observation. There is no mention of feature flags, canary deploys, or automatic rollback if session tracking breaks in production.
- **Failure scenario:** The new throttle logic has an off-by-one bug (e.g., `now - lastPingAt >= 60_000` with floating-point or Date.now() skew). Users' learning sessions silently close early, and their study streaks/data are lost. This is invisible — the user just sees "no session" without knowing WHY.
- **Evidence:** Phase 5 step 73: "Rủi ro chính: (a) bỏ sót sự kiện khiến session đóng oan". The plan acknowledges the risk but provides only manual testing as mitigation.
- **Suggested fix:** Instrument the new tracker with a one-time analytics event or log line on state transitions (ping started, ping skipped, idle detected). Add explicit rollback: if the layout-level tracker throws, the fallback is sidebar-level heartbeat (kept temporarily).

---

## Finding 5: Phase 5 — The `pointerdown` Event Listener Will Fire on Touch-Tap Only
- **Severity:** High
- **Location:** Phase 5, "Mô hình trigger mới" section
- **Flaw:** The plan specifies `pointerdown`, `keydown`, `scroll` (passive), `visibilitychange`, and route change. `pointerdown` does NOT fire on keyboard navigation or mouse click — only on touch/pen. A user reading on desktop with a mouse will NOT trigger `pointerdown` on click.
- **Failure scenario:** Desktop users with mouse clicks generate no events, so the throttle never fires, and their session closes after 10 minutes of idle (server cutoff) even if they are actively reading.
- **Evidence:** `pointerdown` is a touch/pen event. `click` or `mousedown` is needed for mouse. `keydown` covers keyboard.
- **Suggested fix:** Change `pointerdown` to `mousedown` (fires on mouse click) OR add both `pointerdown` and `mousedown` to cover all input types. Alternatively, use `pointerdown` which covers both touch and mouse on browsers that support it.

---

## Finding 6: Phase 7 — `normalizeDictionaryTerm` Import Fix Depends on Phase 6's Timing
- **Severity:** Medium
- **Location:** Phase 7, "Implementation Steps" step 4
- **Flaw:** Phase 7 step 4 says to fix `vocabulary-items.repository.ts` to import `normalizeDictionaryTerm` from `@/features/dictionary/schemas/normalize-dictionary-term` "thay vì bản trong translation-queries.ts". But Phase 6 moves `contracts/dictionary/normalize-dictionary-term.ts` → `features/dictionary/schemas/`. Phase 7 runs AFTER Phase 6, which is correct. However, the plan doesn't verify that Phase 6 actually deletes the source of the duplicate.
- **Failure scenario:** Phase 6 moves the file but keeps the old path as a re-export. Phase 7 "fixes" the import to the new path. Then Phase 11 (reading) ALSO deletes `translation-queries.ts` (which has the duplicate). If Phase 11 runs before Phase 7's fix is merged, there's a window where the duplicate is gone but the correct import path doesn't exist yet.
- **Evidence:**
  - Phase 6 deletes `contracts/dictionary/` but keeps `contracts/dictionary/normalize-dictionary-term.ts` → re-export? (not specified)
  - Phase 7 fixes `vocabulary-items.repository.ts` → imports from new path
  - Phase 11 deletes `server/db/translation-queries.ts` (which has the duplicate at line 29)
- **Suggested fix:** Verify Phase 6 leaves `contracts/dictionary/normalize-dictionary-term.ts` as an empty re-export (not deleted). Phase 11 deletion of `translation-queries.ts` must happen AFTER Phase 7's import fix is confirmed working.

---

## Finding 7: Phase 8 — Question Schemas Left in `server/db/passage-queries.ts` With Unclear Consumer
- **Severity:** High
- **Location:** Phase 8, "Architecture" and Phase 12, "Related Code Files"
- **Flaw:** Phase 8 leaves `questionDataSchema`, `questionDataSchema`, `createQuestion` in `server/db/passage-queries.ts` as a re-export for Phase 12 to pick up. Phase 12 says to "nhặt từ `server/db/passage-queries.ts`" (pick up from re-export). But Phase 12 also deletes `server/db/passage-queries.ts` entirely. If Phase 12 doesn't pick up ALL the question-related exports, the file deletion breaks the build.
- **Failure scenario:** Phase 12 runs, picks up some question exports but misses `createQuestion`, deletes `passage-queries.ts`, and a consumer of `createQuestion` (possibly from `passage-study.service.ts` which was moved to `question-generation.service.ts`) breaks.
- **Evidence:**
  - Phase 8: "phần question chờ phase 12 nhặt"
  - Phase 12: "phần question trong `server/db/passage-queries.ts`" → delete file
  - `server/modules/passage/passage-study.service.ts` imports `questionDataSchema from "@/server/db/passage-queries"` (confirmed in codebase)
- **Suggested fix:** In Phase 8, enumerate EXACTLY which exports are left behind (questionDataSchema, questionOptionSchema, createQuestion) with their exact names. In Phase 12, add a grep step before deleting: "grep 'server/db/passage-queries' src/ must return 0 results."

---

## Finding 8: Phase 10 — Conflicting Decision on `services/clerk.ts` Scope
- **Severity:** Medium
- **Location:** Phase 2, "Architecture" vs Phase 10, "Architecture"
- **Flaw:** Phase 2 says "create `services/clerk.ts` ← from `auth-utils.ts` + `sync-user.ts` (gộp 2 file thành 1)". Phase 10 says "tách `sync-user.ts` (phần DB-specific) ra `features/users/db/`". These are contradictory: Phase 2 says MERGE, Phase 10 says SPLIT.
- **Failure scenario:** Implementation picks one interpretation (e.g., Phase 2 merges, Phase 10 splits back), leaving `services/clerk.ts` in an inconsistent state. Or Phase 2 splits instead of merging, making Phase 10's split instructions impossible.
- **Evidence:**
  - Phase 2 step 23: "gộp 2 file thành 1, hoặc giữ 2 file trong `services/auth/`"
  - Phase 10 step 27: "nếu ở phase 2 đã gộp... phase này tách sync-user.ts ra"
  - The decision is deferred to "lúc code dựa theo độ lớn thực tế" — not a clear decision
- **Suggested fix:** Make the decision upfront. Recommendation: Phase 2 should keep them SEPARATE (auth-utils → services/clerk.ts for pure auth helpers; sync-user → services/clerk-sync.ts or leave in server/auth for Phase 10 to pick up). Merging DB code into services/ violates the "no DB in services" pattern.

---

## Finding 9: Phase 13 — 16-Consumer Type Hub Migration Has No Priority Ordering
- **Severity:** High
- **Location:** Phase 13, "Implementation Steps" step 1
- **Flaw:** Phase 13 step 1 says "grep tất cả import `features/study/shared/types` còn lại — phân loại từng type theo chủ sở hữu, sửa từng consumer import thẳng chỗ mới; typecheck sau mỗi nhóm (passage → reading → studio → glue)". But the groups are NOT ordered by dependency. `passage types` belong to Phase 8 (already done), `reading types` to Phase 11, `studio types` to Phase 12. If Phase 13 runs before Phase 11 or 12, the target import paths don't exist yet.
- **Failure scenario:** Phase 13 runs while Phase 11/12 are still pending. Consumers try to import from `features/reading/schemas/` and `features/studio/schemas/` which don't exist, breaking typecheck before the migration even starts.
- **Evidence:** Phase 13 dependencies are [4, 5, 6, 7, 8, 9, 10, 11, 12] — correct. But the step implementation doesn't explicitly check that each target directory exists before attempting to migrate its types.
- **Suggested fix:** Add explicit "verify target paths exist" step: "ls features/reading/schemas/ features/studio/schemas/" before attempting to migrate consumers.

---

## Finding 10: Phase 14 — Re-Export Cleanup Depends on 13 Prior Phases Not Missing a Re-Export
- **Severity:** Critical
- **Location:** Phase 14, "Implementation Steps" step 1
- **Flaw:** Phase 14's grep for `@/contracts/*` or `@/server/*` imports assumes every re-export was correctly placed across all 13 prior phases. If ANY phase failed to create a re-export (forgot to re-export a function, or created a re-export with a wrong path), the grep at Phase 14 step 1 will find broken imports — but only after all 13 phases are done.
- **Failure scenario:** Phase 7 complete. Phase 14 grep finds a reference to `@/server/modules/spaced-repetition/scheduler` from a file that was supposed to be migrated in Phase 7 but wasn't. The entire cleanup is blocked. Tracking down which phase forgot to create the re-export across 13 phases is expensive.
- **Evidence:** The plan acknowledges this in Risk Assessment: "sót import cũ do re-export tạm che giấu lỗi suốt các phase trước". But the mitigation is only "bước grep ở Implementation Step 1 là bắt buộc, không được bỏ qua" — not a proactive check.
- **Suggested fix:** Add a lightweight re-export verification step at the END of EACH phase (not just Phase 14). After each phase's typecheck pass, grep for any imports of the OLD path that should have been replaced in THAT phase.

---

## Finding 11: The Prisma Singleton Will Exist in Two Places During All 14 Phases
- **Severity:** Medium
- **Location:** Phase 3 and Phase 14 cross-cutting
- **Flaw:** Phase 3 creates `src/lib/prisma.ts` (new singleton). The original `src/server/lib/db.ts` is re-exported. Both files export the same `prisma` singleton. Phase 14 deletes `src/server/lib/db.ts`. But throughout phases 3-13, TWO copies of the Prisma client singleton exist in memory: one from `lib/prisma.ts` and one from `server/lib/db.ts` (which re-exports from lib). This means if any code modifies the `prisma` object's internal state (e.g., adds middleware, changes connection pool settings), changes in one won't reflect in the other.
- **Failure scenario:** A bug is introduced where one code path uses `prisma` from lib/ and another uses prisma from server/lib/db (re-export). If middleware is added in one path, it doesn't apply to the other. This is a subtle state divergence.
- **Evidence:** Phase 3 step 26: "src/lib/prisma.ts ← copy src/server/lib/db.ts". Both are in the require graph during phases 4-13.
- **Suggested fix:** Document that `server/lib/db.ts` MUST be a pure re-export (`export { prisma } from "@/lib/prisma"`) and NOT a separate import+export. Verify with a lint rule or grep: "grep 'PrismaClient' server/lib/db.ts" must return 0.

---

## Finding 12: No Mention of `env.ts` Data Validation in Scope
- **Severity:** Low
- **Location:** Phase 14 and overall plan overview
- **Flaw:** The report.md explicitly flags `data/env.ts` (env validation) as a gap that exists in the project. The plan scope says "MỚI, chưa có" and "user quyết định tách task riêng". But the plan doesn't explicitly document this exclusion in the plan.md scope or in Phase 14's cleanup criteria. After the 14 phases, `data/env.ts` will still not exist.
- **Failure scenario:** Post-restructuring, someone adds new environment variables without validation. The plan restructured the entire codebase but left a known security/validation gap untouched.
- **Evidence:** Report.md: "Không có `data/env.ts` validate env — gap có sẵn từ trước, ngoài phạm vi restructure này". Not mentioned in plan.md as an exclusion.
- **Suggested fix:** Add explicit note in plan.md: "Out of scope: data/env.ts env validation (separate task)."

---

**Total findings:** 12
**Critical:** 3 (Finding 2, 3, 10)
**High:** 6 (Finding 1, 4, 5, 7, 9, 11)
**Medium:** 2 (Finding 6, 8)
**Low:** 1 (Finding 12)
