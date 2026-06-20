# Translation Popup + Save Button UX Research

## 1. Current Popup Anatomy

### Rendering States
The popup has **5 distinct states**:

1. **`ready`** (line 141) — Compact icon mode, positioned near selection release point. Single Languages icon button, 8x8 px fixed position. No dropdown/panel.

2. **`loading`** (lines 205–212) — Full popup panel shows spinner + "translation is loading..." text. User cannot interact with save or other buttons during this phase.

3. **`error`** (lines 214–225) — Full popup displays red error text + "Try Again" button. **Translation data is null** — no save capability shown.

4. **`success`** (lines 227–264) — Full panel displays:
   - Translation text (main content)
   - Type badge (if present, e.g., "noun")
   - Two footer buttons:
     - "Open Details" button (gray, always enabled)
     - **NO SAVE BUTTON** in the popup itself

5. **`idle`** (fallback, lines 85–89) — Selection cleared, popup dismissed.

### Props Passed from `study-page-client.tsx`
- **`translation`**: `QuickTranslationData | null` — contains `translation`, `type`, `provider`
- **`status`**: `"ready" | "loading" | "success" | "error"` (line 11 type def)
- **`selection`**: Full `TranslationSelection` object with `selectedText`, `contextSentence`, `sourceId`, etc.
- **`onTranslate`**: Callback to fetch translation (line 123 handler)
- **`onOpenDetails`**: Opens translate panel in right sidebar (lines 334–342)
- **`onDismiss`**: Clears selection (line 343)

### Save Button Location
**The save button is NOT in the popup.** It lives in `StudyTranslatePanel` (study-translate-panel.tsx), which is rendered in the right sidebar when:
1. User clicks "Open Details" button in the popup
2. OR user clicks "Translate" card in studio panel (line 274)

The save button (lines 74–83 in study-translate-panel.tsx):
- Variant: `outline` when not saved, `ghost` when saved
- Disabled: `true` when already saved
- Icon: Bookmark (unfilled when not saved, **filled when saved**)
- Label: "Save Vocabulary" → "Vocabulary Saved" (translated text)
- Callback: `onSave` → triggers `handleSaveVocabulary` (study-page-client.tsx line 194)

---

## 2. What Is Broken

### Save Error Is Silent
**Root Cause:** Lines 252–258 in `study-page-client.tsx`
```typescript
} catch {
  Sentry.addBreadcrumb({
    category: "study-vocabulary",
    level: "error",
    message: "study-vocabulary-save-error",
  });
  // NO STATE UPDATE — button never reflects error
}
```
When save fails, the button **stays in the clicked state** without visual feedback. User has no idea the save failed. Sentry sees it, but frontend is silent.

### Translation Error Is Shown But Not Clear
Lines 214–225: Error UI shows red "Translation error" text + "Try Again" link. But:
- Error message is generic, no specificity on *why* translation failed
- No error icon (just text)
- Dismissing the popup clears the error context entirely

### No Save-State Button in Popup
User must click "Open Details" to access the save button. The quick popup shows translation but **no way to save from it**. Two-click flow to save.

### Double-Save Possible (Minor)
`handleSaveVocabulary` (lines 194–259) has no loading state. If network is slow:
1. User clicks "Save Vocabulary"
2. Button goes disabled (line 79: `disabled={saved}` checks immediate local state)
3. But optimistic update never happens — button stays enabled until server responds

If user clicks again before response, two identical POST requests fire (only 2nd one will upsert correctly in DB, but it's wasteful).

---

## 3. Icon-State Save Button Spec

### Target States
Current save button (study-translate-panel.tsx lines 74–83):
```
idle/ready:    Save Vocabulary  (outline, enabled, bookmark icon)
saved:         Vocabulary Saved (ghost, disabled, filled bookmark)
```

### Needed States for Popup Integration
If save button moves to the popup (as spec implies "icon-based save states"):

```
idle:          [bookmark-outline] "Save"        (outline, enabled, clickable)
saving:        [spinner]          "Saving..."   (outline, disabled, loading indicator)
saved:         [bookmark-filled]  "Saved"       (ghost, disabled, filled icon)
error:         [x-icon]           "Save Error"  (destructive variant, enabled, red)
```

### JSX Implementation

**Current (in panel):**
```tsx
<Button
  variant={saved ? "ghost" : "outline"}
  size="sm"
  className={cn("h-8 text-xs gap-1.5", saved && "text-muted-foreground")}
  onClick={saved ? undefined : onSave}
  disabled={saved}
>
  <Bookmark className={cn("w-3.5 h-3.5", saved && "fill-current")} />
  {saved ? t("vocabularySaved") : t("saveVocabulary")}
</Button>
```

**Needed (popup + state machine):**
1. Add `saveStatus: "idle" | "saving" | "saved" | "error"` to `QuickTranslationState` (currently only has `requestId`, `data`, `status`).
2. Track `saveError: string | null` for error message.
3. Import `Check`, `AlertCircle` from lucide-react.
4. Conditional render per state:

```tsx
const isSaveDisabled = saveStatus === "saving" || saveStatus === "saved";

<Button
  variant={saveStatus === "saved" ? "ghost" : "outline"}
  size="sm"
  onClick={saveStatus === "error" ? onRetry : (saveStatus === "saved" ? undefined : onSave)}
  disabled={isSaveDisabled}
>
  {saveStatus === "saving" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
  {saveStatus === "saved" && <Check className="w-3.5 h-3.5" />}
  {saveStatus === "error" && <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
  {saveStatus !== "saving" && (
    <span>{t(saveStatus === "saved" ? "vocabularySaved" : "saveVocabulary")}</span>
  )}
</Button>

{saveStatus === "error" && saveError && (
  <p className="text-xs text-destructive mt-1">{saveError}</p>
)}
```

5. Update `handleSaveVocabulary` (study-page-client.tsx) to:
   - Set `saveStatus: "saving"` before fetch
   - Set `saveStatus: "saved"` on success
   - Set `saveStatus: "error"` + `saveError: error.message` on catch
   - Add retry logic for error state

---

## 4. Telemetry Audit — Sensitive Data Logging

### `/api/translate/route.ts`

**Lines checked for raw `text`, `selectedText`, `context`, `contextSentence` logging:**

| Line(s) | Code | Risk | Finding |
|---------|------|------|---------|
| 46–49 | `createRequestLogger()` context setup | ⚠️ MEDIUM | `sourceId` logged (safe), but payload body not inspected here |
| 62 | `requestLog.warn("Invalid JSON payload...")` | ✅ SAFE | Only warns about format, not content |
| 70–73 | `requestLog.warn({context: {issues...}}, "Invalid translation request")` | ✅ SAFE | Only path names (`text`, `context`) not values |
| 87–90 | `requestLog.child({sourceId, targetLanguage})` | ✅ SAFE | No content logged |
| 131 | `requestLog.error({err: error}, "Translation request failed")` | ⚠️ **VERIFY** | `err: error` may include raw text if error is constructed with payload. **No actual payload content passed but stack trace could leak via Sentry capture** (line 132–134). |

**Verdict:** `/api/translate` is SAFE. No raw `text` or `context` logged to console/file. Sentry error capture (line 132) may leak via stack trace if error object contains the body, but error construction (lines 158–165 in study-page-client) doesn't embed body.

---

### `/api/vocabulary/route.ts`

**Lines checked for raw `selectedText`, `translation`, `contextSentence` logging:**

| Line(s) | Code | Risk | Finding |
|---------|------|------|---------|
| 26–29 | `createRequestLogger()` context setup | ✅ SAFE | No payload fields logged |
| 39 | `requestLog.warn("Invalid JSON payload...")` | ✅ SAFE | Only warns about format |
| 45–49 | `requestLog.warn({context: {issues...}}, "Invalid vocabulary request")` | ✅ SAFE | Only path names, not values |
| 53–56 | `requestLog.child({targetLanguage, source})` | ✅ SAFE | No content logged |
| 112–120 | `requestLog.info({context: {vocabularyItemId, selectedTextLength}}, "Vocabulary item saved")` | ✅ SAFE | Only logs **length**, not actual text. `vocabularyItemId` is safe (UUID). |

**Verdict:** `/api/vocabulary` is SAFE. No raw vocabulary content logged. Only metadata (length, IDs, source type) recorded.

---

### Client-Side Telemetry (`study-page-client.tsx`)

**Sentry breadcrumbs audit:**

| Line(s) | Message | Risk | Finding |
|---------|---------|------|---------|
| 100–106 | `study-translation-selection-captured` | ✅ SAFE | Only logs `sourceId`, `selectedTextLength` (not text) |
| 135–140 | `study-translation-request` | ✅ SAFE | Only logs `sourceId`, `selectedTextLength` |
| 172–177 | `study-translation-success` | ✅ SAFE | Only logs `provider` (cache/dictionary/google_translate/ai) |
| 198–203 | `study-vocabulary-save-click` | ✅ SAFE | Only logs `sourceId`, `selectedTextLength` |
| 246–251 | `study-vocabulary-save-success` | ✅ SAFE | Only logs `vocabularyItemId` (UUID) |

**Verdict:** Client telemetry is SAFE. No raw text, translation, or context sentences logged.

### Sentry Error Capture (`study-page-client.tsx` lines 132, 184, 253)

**Risk:** Generic `throw new Error("Quick translation failed")` does NOT include payload. Error object is clean.

**BUT:** If telemetry is upgraded to include debug context, developers must audit:
1. No `selection.selectedText` in Sentry context
2. No `selection.contextSentence` in Sentry context
3. No `translation.translation` in Sentry context

---

## 5. Key Files to Modify

### Phase 1: Extend State + Add Save Icon States
- **`src/features/study/study-page-client.tsx`**
  - Line 59–63: Extend `QuickTranslationState` type with `saveStatus` and `saveError`
  - Line 194–259: Enhance `handleSaveVocabulary()` with state machine for save button
  - Line 75–79: Manage `saveStatus` transitions (idle → saving → saved/error)

### Phase 2: Update Popup UI
- **`src/features/study/study-translation-popup.tsx`**
  - Line 13–20: Add `saveStatus`, `saveError`, `onSaveVocabulary`, `onRetrySave` props
  - Line 227–264: Add save button to success state (new UI section)
  - Line 5–6: Import `Check`, `AlertCircle` icons

### Phase 3: Update Panel (Fallback)
- **`src/features/study/study-translate-panel.tsx`**
  - Lines 74–83: Optionally enhance with same icon states (or leave as is if save-in-popup is prioritized)

### Phase 4: Schema + Types
- **`src/features/study/study-types.ts`**
  - Line 11: Extend `QuickTranslationStatus` to include save states, OR create separate `SaveStatus` type
  - Consider: `type VocabularySaveStatus = "idle" | "saving" | "saved" | "error"`

---

## Summary

| Issue | Severity | Scope |
|-------|----------|-------|
| Silent save error | **HIGH** | UX: User doesn't know save failed; Sentry-only visibility |
| No save in popup | **MEDIUM** | UX: Requires "Open Details" → extra click |
| Save state not icon-based | **MEDIUM** | UX: Inconsistent with icon-driven design goals |
| Double-save possible | **LOW** | Data: Duplicate requests, no data corruption |
| Translation error generic | **LOW** | UX: Error messaging could be more specific |

**Telemetry:** Clean. No raw sensitive data (text, context, translation) logged in translate or vocabulary routes. Breadcrumbs log only metadata (IDs, lengths, providers).

---

## Unresolved Questions

1. Should the save button live in the popup (preferred per spec "icon-based save states") or remain panel-only?
2. What is the desired error message for failed saves? Generic "Unable to save" or specific (network, auth, server)?
3. Should "Retry" be a separate button or should clicking the error icon auto-retry?
4. Does the save button need a confirmation/toast after success, or is the icon sufficient?
