# Code Review: Study Page and Components

**Date:** 2026-05-06
**Scope:** 33 files (pages, shared components, instrumentation)
**Focus:** Security, React patterns, error handling, performance, UX

---

## Overall Assessment

Codebase is well-structured with good type safety, consistent patterns, and proper error boundaries at route level. No XSS vectors found. Several real bugs and UX issues identified -- mostly around stale closures, dead UI elements, and missing error handling on API calls.

---

## Critical Issues

None found.

---

## High Priority

### H1. Stale closure in `handleActionClick` guard check
- **FILE:** `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/study/study-page-client.tsx:143,165`
- **ISSUE:** The guard `if (state.activePassageId !== passageId)` reads `state.activePassageId` from the closure captured at the time the callback was created. Because `handleActionClick` depends on `[state.activePassageId, state.passages]`, it recreates on passage change. However, during the `await`, the state could have already changed and the *newly recreated* callback would have the correct value -- but there is a window where the callback still references the old value. More importantly, the comment says "discard if user switched passage during generation" but the actual check uses `state.activePassageId` (closure) not a ref. If the user switches passage and switches back before the await resolves, this guard passes incorrectly.
- **FIX:** Use a ref (`useRef`) for the active passage ID, update it in `handleSelectDocument`, and check the ref in the async callbacks. This guarantees the check always reads the latest value.

### H2. Fake processing progress bar is misleading
- **FILE:** `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/processing/page.tsx:18-47`
- **ISSUE:** The processing page uses a hardcoded `setInterval` timer that always completes in ~6 seconds regardless of actual processing state. The `contentId` and `filename` params are used to redirect, but the page never polls or receives real status updates. If the server takes longer, user sees "100% complete" then gets redirected to a page that may not be ready.
- **FIX:** Either (a) poll an actual status endpoint, or (b) if this page is vestigial (study page now handles upload inline), consider removing it and redirecting directly from the upload handler.

### H3. `response.json()` called twice on success path in upload page
- **FILE:** `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/upload/page.tsx:25-30`
- **ISSUE:** When `response.ok` is true, the code falls through and calls `const result = await response.json()` on line 30. But when `!response.ok`, it also calls `await response.json()` on line 26 then throws. This is correct. However, if the response body is not valid JSON (e.g., server returns HTML error page with 200 status), `response.json()` on line 30 will throw an unhelpful parsing error.
- **FIX:** Wrap the success-path `response.json()` in a try-catch, or validate the response Content-Type before parsing.

### H4. `alert()` used for error display
- **FILE:** `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/upload/page.tsx:38,67`
- **ISSUE:** Using `alert()` blocks the main thread, provides poor UX, and on some mobile browsers can be jarring. The study upload modal already uses inline error display -- inconsistency.
- **FIX:** Replace with inline error display (toast or form-level error message), matching the pattern used in `study-upload-modal.tsx`.

---

## Medium Priority

### M1. Hardcoded dead reading progress bar in study page
- **FILE:** `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/study/study-page-client.tsx:218-221`
- **ISSUE:** The "Sticky reading progress bar" is always at `width: '0%'` and has no state driving it. It is purely decorative dead UI that misleads users into thinking scroll progress is tracked.
- **FIX:** Either wire it to actual scroll progress of the content panel (using IntersectionObserver or scroll events), or remove it entirely.

### M2. Dead "Translate passage" and action buttons
- **FILE:** `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/study/study-content-panel.tsx:168-178`
- **ISSUE:** "Translate passage", Bookmark, and Share2 buttons have no `onClick` handlers. They look interactive but do nothing.
- **FIX:** Either add handlers or visually indicate they are not yet implemented (e.g., `disabled` prop, tooltip "Coming soon").

### M3. Processing page uses `status` type that doesn't match state
- **FILE:** `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/processing/page.tsx:11,21-23`
- **ISSUE:** The `status` state type is `"analyzing" | "generating" | "complete"` but the `stages` array includes `"simplifying"` which is mapped to `"analyzing"` via a conditional. This is confusing and the `"simplifying"` value never actually appears in state.
- **FIX:** Remove `"simplifying"` from stages array; use descriptive labels directly in the stage objects instead of mapping.

### M4. Keyboard event listener not scoped to component
- **FILE:** `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/study/study-quiz-content.tsx:82-83` and `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/test/[id]/flashcard-test-client.tsx:81-82`
- **ISSUE:** `window.addEventListener("keydown", ...)` fires globally. If user navigates away from the test/quiz view but the component hasn't unmounted yet (e.g., during route transition), key presses could trigger unintended actions. Also, keys 1-4 could conflict with other inputs on the page.
- **FIX:** Scope the listener to the test container element instead of `window`, or add a focus check (`document.activeElement` is not an input).

### M5. `selectedIds` state in left panel is unused
- **FILE:** `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/study/study-left-panel.tsx:26,39-54,98-109`
- **ISSUE:** The `selectedIds` Set, `toggleSelectAll`, and `toggleSelect` functions are defined and rendered as checkboxes, but no parent component reads or uses the selection. This is dead code that adds UI complexity.
- **FIX:** Either wire up bulk actions (delete, export) that use `selectedIds`, or remove the selection UI entirely.

### M6. Missing error handling on fetch in progress dashboard
- **FILE:** `/home/luc/Project/english-reading-training-app/src/components/progress-dashboard.tsx:30-31`
- **ISSUE:** If `response.ok` is false (e.g., 500), `response.json()` might throw or return an unexpected shape. The code only checks `result.success` but doesn't handle non-JSON error responses.
- **FIX:** Add `if (!response.ok)` check before parsing JSON, similar to the upload page pattern.

### M7. `handleDrop` callback in upload modal has stale closure over `handleFileUpload`
- **FILE:** `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/study/study-upload-modal.tsx:71-93`
- **ISSUE:** `handleDrop` is memoized with `[]` deps but calls `handleFileUpload` which is not in the dependency array (suppressed with eslint-disable comment). `handleFileUpload` captures `onUploadStart`, `onClose`, and `onUploadComplete` from props. If these change between renders, the stale closure will call old versions.
- **FIX:** Include `handleFileUpload` in the dependency array, or use refs for the callback props.

### M8. Search input in upload modal does nothing
- **FILE:** `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/study/study-upload-modal.tsx:149-157`
- **ISSUE:** The "Search sources on the web..." input has no `onChange` handler or associated search functionality. It is a dead interactive element.
- **FIX:** Either implement search or disable/hide the input with a "Coming soon" label.

### M9. `ErrorBoundary` class component not used anywhere
- **FILE:** `/home/luc/Project/english-reading-training-app/src/components/error-boundary.tsx`
- **ISSUE:** The `ErrorBoundary` class component exists but is not imported or used by any page/component. All error handling uses Next.js route-level error boundaries.
- **FIX:** Either use it to wrap client-side interactive sections (study panels, quiz) or remove the dead code.

### M10. Mobile sidebar doesn't close on route change
- **FILE:** `/home/luc/Project/english-reading-training-app/src/components/dashboard-sidebar.tsx:62-67`
- **ISSUE:** The mobile sidebar overlay closes on click, but if user clicks a nav link that triggers a route change, `onNavigate` (which calls `closeMobile`) only fires for the mobile sidebar links. The overlay itself doesn't auto-close on navigation.
- **FIX:** Add a `useEffect` that closes the mobile menu when `pathname` changes.

---

## Low Priority

### L1. Duplicate quiz logic between `flashcard-test-client.tsx` and `study-quiz-content.tsx`
- **FILE:** `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/test/[id]/flashcard-test-client.tsx` and `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/study/study-quiz-content.tsx`
- **ISSUE:** Both implement nearly identical quiz flow: state management, answer selection, feedback, keyboard shortcuts, scoring. ~200 lines of duplicated logic.
- **FIX:** Extract shared quiz logic into a custom hook (e.g., `useQuizState`) and shared question rendering component.

### L2. Inline styles mixed with Tailwind classes
- **FILE:** `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/study/study-left-panel.tsx:57,59`, `study-right-panel.tsx:69,70,116`, `study-upload-modal.tsx` (extensive)
- **ISSUE:** Hard-coded hex colors (`#e5e7eb`, `#ffffff`, `#B5D4F4`, `#E6F1FB`, `#378ADD`, `#0a1a2e`, `#6b7b8d`) and inline styles are mixed with Tailwind utility classes. Makes theming impossible and creates inconsistency.
- **FIX:** Define these as Tailwind theme extensions or CSS custom properties.

### L3. `console.error` calls in production code
- **FILE:** `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/upload/page.tsx:37,66`, `/home/luc/Project/english-reading-training-app/src/components/progress-dashboard.tsx:36`
- **ISSUE:** `console.error` statements in production client code. These should go through Sentry or a logging service (which is already configured).
- **FIX:** Replace with `Sentry.captureException` or remove if the error is already handled via UI.

### L4. Missing `aria-label` on icon-only buttons
- **FILE:** `/home/luc/Project/english-reading-training-app/src/app/page.tsx:77-80` (Settings, Help), `/home/luc/Project/english-reading-training-app/src/components/dashboard-sidebar.tsx:108` (notification bell), `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/study/study-content-panel.tsx:173-177` (Bookmark, Share)
- **ISSUE:** Icon-only buttons lack `aria-label`, making them inaccessible to screen readers. The `title` attribute is present on some but is not a reliable accessibility mechanism.
- **FIX:** Add `aria-label` to all icon-only buttons.

### L5. `Placeholder` text in header
- **FILE:** `/home/luc/Project/english-reading-training-app/src/app/page.tsx:95-99`, `/home/luc/Project/english-reading-training-app/src/components/dashboard-sidebar.tsx:113-118`
- **ISSUE:** User name and subtitle display "Placeholder" text. Should be either real data or removed.
- **FIX:** Display actual user info or use a generic greeting. Since there's no auth, consider hiding the avatar section entirely.

### L6. `useCallback` on stable functions
- **FILE:** `/home/luc/Project/english-reading-training-app/src/app/(dashboard)/study/study-page-client.tsx:202-208`
- **ISSUE:** `handleOpenUploadModal` and `handleCloseUploadModal` wrap simple state setters with `useCallback([], [])`. The empty dependency arrays are correct (they use functional state updates), but the memoization adds complexity for no measurable perf gain on such trivial setters.
- **FIX:** Low priority -- acceptable as-is, but could be simplified to inline arrow functions.

---

## Positive Observations

1. **No XSS vectors** -- No `dangerouslySetInnerHTML` anywhere in the codebase. User content (passage text, quiz questions) is always rendered via React JSX text nodes.
2. **Consistent error boundary pattern** -- Every route group has a proper `error.tsx` with Sentry integration.
3. **Good type safety** -- Proper TypeScript interfaces for all data shapes, discriminated unions for action results (`'error' in result`).
4. **Server component / client component split** is correct -- data fetching in server components, interactivity in client components.
5. **File validation** is done both at dropzone level and explicit `validateFile` call before upload.
6. **`useCallback`/`useMemo`** used appropriately for preventing unnecessary re-renders in the study page.

---

## Recommended Actions

1. **Fix stale closure** in `handleActionClick` (H1) -- use ref for activePassageId
2. **Remove or fix** dead progress bar (M1) and dead buttons (M2, M8)
3. **Replace `alert()`** with inline error display (H4)
4. **Wire up or remove** unused `selectedIds` bulk selection (M5)
5. **Scope keyboard listeners** to component container (M4)
6. **Consolidate duplicate quiz logic** into shared hook (L1)
7. **Add `aria-label`** to all icon-only buttons (L4)
8. **Decide on processing page** -- remove or add real status polling (H2)

---

## Unresolved Questions

1. Is the `/processing` page still needed now that the study page handles uploads inline with streaming UI?
2. Are the "Website" and "Google Drive" upload sources planned for near-term implementation, or should they be hidden entirely?
3. Is the bulk selection feature (checkboxes in sources panel) planned for a specific feature (e.g., bulk delete, export)?
4. What should the reading progress bar at the top of the study page track -- scroll position within the content panel?
