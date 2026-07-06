# Red Team Report: Scope & Complexity Critic

## Contract Verifier Role Summary

Verified imports vs. plan claims across the codebase. Found significant discrepancies.

---

## Finding 1: Phase 7 Misidentifies the `normalizeDictionaryTerm` Problem
- **Severity:** High
- **Location:** Phase 7 (Vocabulary), section "Requirements" and "Implementation Steps"
- **Flaw:** The plan states vocabulary-import `normalizeDictionaryTerm` from the WRONG location. Phase 7 says: "trong `vocabulary-items.repository.ts` (đã move vào `features/vocabulary/db/`), đổi import trỏ về `@/features/dictionary/schemas/normalize-dictionary-term`". But `vocabulary-items.repository.ts` currently imports `normalizeDictionaryTerm` ONLY indirectly -- via `getOwnedTranslationSource` from `translation-queries.ts`, not directly.
- **Failure scenario:** After Phase 6 moves dictionary schemas to `features/dictionary/`, Phase 7 tries to fix vocabulary's import but finds `vocabulary-items.repository.ts` does NOT directly import `normalizeDictionaryTerm`. The plan's fix won't land because the "wrong import" it's targeting doesn't exist at that location. The actual fix (fixing `translation-queries.ts`'s duplicate definition) falls through the cracks, leaving 2 copies forever.
- **Evidence:**
  - `vocabulary-items.repository.ts:5` only imports `getOwnedTranslationSource` from `translation-queries.ts`
  - `server/db/translation-queries.ts:29` exports the duplicate `normalizeDictionaryTerm`
  - Phase 7 never mentions `translation-queries.ts` cleanup despite it being the sole repository of the duplicate
  - Phase 11 mentions fixing `normalizeDictionaryTerm` in translation-queries ("BỎ normalizeDictionaryTerm trùng") but Phase 7 doesn't coordinate with Phase 11

---

## Finding 2: Phase 5 "Event-Driven Trigger" Is Behavioral Over-Engineering
- **Severity:** High
- **Location:** Phase 5, section "Overview" and "Architecture"
- **Flaw:** The heartbeat refactor is not a restructure/migration -- it is a new feature implementation disguised as a file move. The plan admits this ("REFACTOR mô hình trigger heartbeat", "đây là behavioral change, không chỉ move file"). But the stated goal is restructure (colocation), not behavior change. This conflates two distinct tasks with different risk profiles.
- **Failure scenario:** The 60-second throttle logic, the 5-event listener set (`pointerdown`, `keydown`, `scroll`, `visibilitychange`, route-change), and the `lastPingAt` ref management must all be designed, implemented, and tested. If the throttle is off by 1 second, sessions close prematurely. If `scroll` triggers too often, throttle works but the developer spent 3 hours building event listeners for something that could have been a `setTimeout` with an idle check.
- **Evidence:**
  - Phase 5 Effort: "3h" -- the heartbeat refactor alone likely costs 2h of that
  - Phase 5 Risk Assessment explicitly says "behavioral change" and names concrete failure scenarios (session closing unfairly, throttle bug)
  - No prototype or spike is planned before full implementation
  - The existing `SESSION_IDLE_MS` server-side cutoff already handles the "tab open but not interacting" problem -- the client-side throttle is redundant safety, not core functionality

---

## Finding 3: Phase 14 Cleanup Verification Step 1 Is Impossible to Verify Before Phase 13
- **Severity:** Critical
- **Location:** Phase 14, Implementation Step 1
- **Flaw:** Step 1 says "Grep tất cả `src/` tìm import còn trỏ `@/contracts/*` hoặc `@/server/*`" -- but this step is placed FIRST before any file deletion. More critically, the plan has no mechanism to catch import mismatches during phases 1-13 when re-exports are "cheating" (Phase 1 plan overview explicitly says re-exports "cheat" breaking imports). By Phase 14, accumulated re-export errors could produce a cascade of broken imports that requires backtracking through multiple phases.
- **Failure scenario:** After completing all 14 phases, the cleanup grep finds 15 files still importing old paths. Some are re-export chains that worked through TypeScript but broke at runtime. Tracing back which phase introduced each breakage requires re-running typecheck for each of 14 phases.
- **Evidence:**
  - Plan says: "re-export tạm để tránh vỡ import giữa các phase" -- this is an acknowledged gap
  - 74 direct imports from `@/contracts/*` confirmed by grep -- every single one depends on re-export chain remaining intact for 13 phases
  - Phase 14 Risk Assessment admits: "sót import cũ do re-export tạm che giấu lỗi suốt các phase trước"

---

## Finding 4: Phase 8 Passage Entity Consolidation Creates a Backward-Breaking Schema Change
- **Severity:** High
- **Location:** Phase 8, section "Ownership check hợp nhất" and "Lưu ý phân loại"
- **Flaw:** The plan consolidates 3 ownership check variants (`findOwnedPassage` from passage-study.repository, `getOwnedTranslationSource` from translation-queries, and the implicit check in `deletePassage`) into 1 `findOwnedPassage` function with a flexible `select` parameter. This changes the function signature and return type from what Phase 8's consumers (upload, reading, studio, vocabulary) expect. The plan assumes a `select` parameter can make one function serve all three callers without breaking them -- but the three callers have DIFFERENT select fields.
- **Failure scenario:** After Phase 8, `chat-service.ts` calls `findOwnedPassage` expecting `{ id, content, title }` (from `passage-study.repository.ts:30`), but the consolidated function now returns `{ id }` (the minimal shared shape). Chat gets undefined `content`/`title`, chat feature breaks silently.
- **Evidence:**
  - `chat-service.ts:28-31` selects `{ id: true, content: true, title: true }`
  - `translation-queries.ts:47-50` selects `{ id: true, title: true }`
  - `passage-study.repository.ts:56-59` selects full passage (no select)
  - The plan's "flexible `select` parameter" assumption needs concrete schema validation per caller

---

## Finding 5: Phase 9 Upload Creates `createPassage` But Phase 8 Never Defined Its Signature
- **Severity:** High
- **Location:** Phase 9, "Requirements" and "Related Code Files"; Phase 8, "Architecture"
- **Flaw:** Phase 9 requires "bổ sung hàm create/update passage vào `features/passage/db/passage-queries.ts`" -- but Phase 8's passage-queries creation does NOT include any create/update functions. Phase 8 only lists: `getUserPassages`, `getUserPassageOverview`, `getPassageWithQuestions`, `deletePassage`, `findOwnedPassage`. The `createPassage`/`updatePassageAnalysis` functions that Phase 9 depends on are never planned for Phase 8.
- **Failure scenario:** Phase 9 runs, tries to call `createPassage` from `features/passage/db/`, the function doesn't exist. Phase 9 blocks.
- **Evidence:**
  - Phase 8 Architecture only lists 5 functions, none are create/update
  - Phase 9 Related Code Files mentions adding these functions to passage-queries but Phase 8 doesn't carry this forward
  - `content-analysis.repository.ts:32` uses `prisma.passage.create` -- this logic needs to live somewhere in phase 8 or phase 9's portion of phase 8

---

## Finding 6: Phase 13 Type Hub Migration Has Uncounted Consumers
- **Severity:** Medium
- **Location:** Phase 13, section "Overview" and "Phân bổ type cuối"
- **Flaw:** The plan claims `features/study/shared/types.ts` has "16 consumer" and distributes these across phases 8, 11, 12. But the grep verification found 19 imports from this single file across 19 different locations. The plan systematically undercounts the migration surface.
- **Failure scenario:** Phases 8, 11, 12 migrate their assigned type groups but miss the consumers that live in OTHER features being migrated later. E.g., `study-workspace-client.tsx` imports from the type hub, but the plan assigns it to Phase 13. However, Phase 12 studio might reference a type from that hub, creating a cross-phase dependency the plan doesn't account for.
- **Evidence:**
  - Plan claims: "16 consumer"
  - Grep result: 19 import lines from `features/study/shared/types`
  - Discrepancy of 3 unaccounted consumers
  - List of actual consumers includes: `studio-panel.tsx`, `studio-questions-client.ts`, `use-study-artifacts.ts`, `translation-popup.tsx`, `study-workspace-client.tsx`, `content-panel.tsx`, `sources-panel.tsx`, `upload-modal.tsx`, `studio-action-tile.tsx`, `quiz-content.tsx`, `use-study-workspace-state.ts`, `lookup-panel.tsx`, `use-study-actions.ts`, `study/page.tsx`, `studio-artifacts-service.ts` -- that's 15 unique files

---

## Finding 7: Phase 2 Unresolved `auth-utils.ts` + `sync-user.ts` Merge Decision
- **Severity:** Medium
- **Location:** Phase 2, section "Architecture"
- **Flaw:** Phase 2 says "gộp 2 file thành 1, hoặc giữ 2 file trong `services/auth/` nếu tách rời rõ ràng hơn -- quyết định lúc code dựa theo độ lớn thực tế của 2 file". Phase 10 (Users) then says the same thing: "nếu ở phase 2 đã gộp... phase này tách...". Both phases defer the architectural decision to "at code time." But Phase 10's entire existence depends on Phase 2's decision being correct.
- **Failure scenario:** Phase 2 merges the files. Phase 10 then can't cleanly extract `sync-user.ts` because the DB-specific code is now mixed with auth helpers. The plan's Phase 10 architecture assumes a clean separation that Phase 2's optional merge could destroy.
- **Evidence:**
  - `server/auth/auth-utils.ts` and `server/auth/sync-user.ts` are the source files for Phase 2's `services/clerk.ts`
  - Phase 10: "nếu ở phase 2 đã gộp... phase này tách sync-user.ts"
  - No criteria given for when to merge vs. keep separate
  - Phase 10 effort estimate ("2h") doesn't include any time for "untangling if Phase 2 merged wrong"

---

## Finding 8: Phase 12 `passage-study.repository` Rename Is Under-Specified
- **Severity:** Medium
- **Location:** Phase 12, section "Architecture"
- **Flaw:** The plan says `passage-study.service.ts` should be renamed to `question-generation.service.ts` because "tên cũ gây hiểu nhầm là passage entity". But `passage-study.repository.ts` is not renamed in Phase 8 (when it should be, since Phase 8 creates `features/passage/`). Phase 12 has to rename `passage-study.repository.ts` but the file now lives in a completely different location and Phase 12's plan doesn't account for this move.
- **Failure scenario:** Phase 8 creates `features/passage/` but doesn't move `passage-study.repository.ts` (it's studio logic, not passage entity logic). Phase 12 tries to rename a file at `server/modules/passage/passage-study.repository.ts` but the import paths from Phase 8's type migration have already broken it.
- **Evidence:**
  - Phase 8 explicitly says: `questionOptionSchema`, `questionDataSchema`, `createQuestion` stay as re-export in `server/db/passage-queries.ts` -- implying `passage-study.repository.ts` is also NOT moved to passage feature
  - Phase 12 then needs to pick up `passage-study.repository.ts` from its old location, but Phase 8 didn't guarantee the file stayed there

---

## Finding 9: Phase 1 CEF R Type Move Has Zero Consumers (YAGNI)
- **Severity:** Low
- **Location:** Phase 1, section "Overview" and "Related Code Files"
- **Flaw:** Phase 1 moves `contracts/domain/cefr.ts` to `types/cefr.ts` and re-exports from the old location. But there is NO evidence that any consumer uses this file besides the re-export itself. The plan says "copy nội dung từ `src/contracts/domain/cefr.ts`" but doesn't verify if any of the 74 `@/contracts/*` imports are specifically for cefr.ts.
- **Failure scenario:** The plan creates a re-export for a file with zero consumers. After 13 phases, Phase 14 tries to delete `contracts/domain/cefr.ts` and discovers the re-export was always unnecessary.
- **Evidence:**
  - Grep for `@/contracts/domain/cefr` found zero results in consumer files
  - `contracts/domain/cefr.ts` exports: `CEFRLevel`, `TARGET_LEVEL_MAP`, `getCEFRLabel`
  - Phase 1 Effort: "1h" -- an hour to move a file with no consumers is disproportionate

---

## Finding 10: Phase 3 `model-config.ts` Deferral Creates Technical Debt Accumulation
- **Severity:** Low
- **Location:** Phase 3, section "Architecture"
- **Flaw:** Phase 3 defers `server/lib/model-config.ts` with a vague "nếu chỉ 1-2 feature dùng, để lại chờ migrate cùng feature đó". No verification of actual consumer count. No deadline. No owner assigned. This is a pattern throughout the plan: unclear items get deferred without criteria, creating invisible technical debt.
- **Failure scenario:** After all 14 phases complete, `model-config.ts` still sits in `server/lib/`. Phase 14 can't delete `server/` because of it. The plan leaves `server/` partially alive with no clear cleanup path.
- **Evidence:**
  - `chat-service.ts:7` imports `getStudyChatModelId` from `server/lib/model-config`
  - `content-analysis.service.ts` likely also uses it
  - At least 2 consumers confirmed, meeting Phase 3's own threshold for migration -- yet it's still deferred

---

## Unresolved Questions

1. Phase 5: The "event-driven trigger" behavioral change -- is this in scope for a RESTRUCTURE plan? Or should it be a separate task?
2. Phase 8/9: Who owns `createPassage`/`updatePassageAnalysis` -- Phase 8 (passage entity) or Phase 9 (upload)? The boundary is unclear.
3. Phase 12: Does `passage-study.repository.ts` get moved in Phase 8 or Phase 12? The plan says different things in Phase 8 (keeps it) and Phase 12 (picks it up).
4. Phase 13: Which of the 19 actual type hub consumers get migrated in which phase? The plan distributes 16 (incorrect count) across phases 8/11/12/13.
5. The plan assumes sequential phases with no rollback mechanism. If Phase 7 breaks because of the `normalizeDictionaryTerm` issue (Finding 1), can Phase 8+ proceed? What's the recovery plan?
