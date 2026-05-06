# Code Review: Studio Right Panel Refactor

## Scope
- Files: `study-types.ts`, `study-right-panel.tsx`, `study-page-client.tsx`
- LOC: ~337 (right panel) + ~87 (types) + ~213 (client)
- Focus: Refactored right panel -- vertical list cards, streaming queue, history section

## Overall Assessment

Solid refactor with clean separation. Two bugs found -- one critical (state stuck), one high (stale history data). The useEffect completion logic is architecturally sound but has edge cases. Unused exports and imports present.

---

## Critical Issues

### 1. `simplifying` flag never resets on "skipped" result -- panel stuck forever

**File:** `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/study/study-page-client.tsx` line 82

```typescript
if ('skipped' in result) return; // <-- early return, simplifying stays true
```

When `studySimplifyAction` returns `{ skipped: true, reason: ... }`, the code returns early without resetting `simplifying: false`. This means:
- The streaming task spinner in the right panel runs indefinitely
- The useEffect watching `simplifying` (false->false) never fires, so the task never moves to history
- The "Simplify" button stays disabled in content panel (line 129 of `study-content-panel.tsx`)

**Fix:**
```typescript
if ('skipped' in result) {
  setState((prev) => ({ ...prev, simplifying: false }));
  return;
}
```

---

## High Priority

### 2. History detail view shows stale `questions` for old quiz completions

**File:** `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/study/study-right-panel.tsx` lines 149-169

When a user clicks a history item of type `quiz`, the detail view renders `QuizContent` using the current `questions` prop from the parent. But `questions` only holds the *latest* generation result. If the user:
1. Generates quiz for passage A (quiz moves to history)
2. Switches to passage B, generates quiz for passage B
3. Clicks the history item for passage A's quiz

...they see passage B's questions labeled as passage A's quiz.

This is a data integrity issue -- the history item captures `passageTitle` but not the actual questions. Either:
- (a) Store `questions` snapshot in `HistoryItem` (widens the type)
- (b) Disable clicking old quiz history items when questions belong to a different passage
- (c) Only show quiz history for the currently active passage

### 3. Race condition: rapid card clicks create duplicate streaming tasks before concurrent check updates

**File:** `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/study/study-right-panel.tsx` lines 122-146

`canStartTask` is computed from `streamingTasks` state, but `handleCardClick` calls `setStreamingTasks` (async state update) and then immediately fires the action. Two rapid clicks within the same render frame both see `canStartTask === true` and both add tasks + fire actions. The `MAX_CONCURRENT_TASKS = 3` guard only prevents the 4th click, not the 2nd-3rd in the same tick.

In practice, React batches state updates in event handlers so this is partially mitigated, but if `onGenerateQuestions`/`onSimplify` are async and the user clicks before re-render, duplicates are possible.

**Mitigation:** Use a ref for the count check, or debounce clicks, or check inside the state updater:
```typescript
setStreamingTasks((prev) => {
  if (prev.filter((t) => t.status === "running").length >= MAX_CONCURRENT_TASKS) return prev;
  return [...prev, task];
});
```

### 4. useEffect completion logic fires on mount if refs are initialized wrong

**File:** `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/study/study-right-panel.tsx` lines 77, 86-102

`prevGeneratingRef` is initialized to `generatingQuestions` (the current prop value). On first render with `generatingQuestions=false`, the ref is `false`, so the effect is harmless. But if the component mounts while `generatingQuestions=true` (e.g., parent starts generating before child mounts), the ref is `true` and the first effect run sees `prev(true) && !current(true) === false` -- no false positive. This is actually correct for the initial case.

However: if the component unmounts and remounts while a generation is in-flight, the ref reinitializes to `true` and the completion detection still works correctly on the next `false` transition. **No bug here** after closer analysis, but worth noting the assumption relies on prop transitions always being `true->false`, never `true->true->false` across remounts.

---

## Medium Priority

### 5. `activeHistoryId` can reference a deleted/nonexistent history item

If history items were ever cleared (not currently possible, but no guard exists), `activeHistoryItem` would be `null` and the `if (activeHistoryItem)` block on line 149 would fall through to the normal view -- silently losing the user's navigation context. Minor since history is currently append-only.

### 6. `relativeTime` never updates -- shows static "just now" until re-render

**File:** `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/study/study-right-panel.tsx` lines 41-50

`relativeTime(item.completedAt)` is computed at render time. Since nothing triggers re-renders on time passing, a history item created 5 minutes ago still shows "just now" until the user interacts with the panel. Acceptable for MVP but worth noting.

### 7. Unused exports in `study-types.ts`

- `StreamingTaskStatus` (line 68) -- only used as the value type for `StreamingTask.status`, never imported elsewhere
- `HistoryItemType` (line 79) -- same, only used as `HistoryItem.type` value type
- `StudioCard` interface (lines 60-66) -- never imported or used anywhere

These are low-impact but add dead code to the module surface.

---

## Low Priority

### 8. Inline styles mixed with Tailwind classes

Several places use `style={{ background: '#ffffff', borderRadius: '12px' }}` alongside Tailwind classes. Should pick one approach for consistency. The color `#ffffff` and `#e5e7eb` appear repeatedly and could be Tailwind tokens (`bg-white`, `border-gray-200`).

### 9. `StudioCard` type in types file is unused

The old `StudioCard` interface with `iconName: string` pattern is dead code from the pre-refactor grid layout. Safe to remove.

---

## Positive Observations

- Clean type separation -- `StudioCardId`, `StreamingTask`, `HistoryItem` are well-shaped
- `MAX_CONCURRENT_TASKS` as a named constant is good
- Panel replacement (Approach A) for history detail is the right UX choice -- avoids nested scroll contexts
- Empty state handling is complete
- Disabled cards with "Soon" label is good UX for unreleased features
- Quiz history correctly checks `questions.length > 0` before rendering (line 151)
- TypeScript compiles clean

---

## Recommended Actions

1. **[CRITICAL]** Fix `simplifying` stuck state on `skipped` result in `study-page-client.tsx:82`
2. **[HIGH]** Address stale quiz questions in history detail view (store snapshot or scope to active passage)
3. **[HIGH]** Move concurrent task check inside `setStreamingTasks` updater to prevent race
4. **[MEDIUM]** Consider adding a timer or `useInterval` for `relativeTime` updates
5. **[LOW]** Remove unused `StudioCard`, `StreamingTaskStatus`, `HistoryItemType` exports
6. **[LOW]** Consolidate inline styles to Tailwind tokens

---

## Unresolved Questions

- Should history items persist across passage switches, or clear when a new passage is selected? Current behavior: persist indefinitely in memory.
- Is there a design for the summary history detail view beyond the placeholder? Currently shows a "Generate Summary" button that calls `onSimplify` on the active passage, not the historical one.
- Should `relativeTime` update live (needs interval) or is render-time-only acceptable?
