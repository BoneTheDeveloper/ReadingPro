# E2E Upload Flow Testing Guide

Testing the two-step upload flow: **text extraction** → **AI analysis**.

---

## Architecture Under Test

```
File Upload:  Study page → POST /api/upload → { text, title } → studyAnalyzeAction() → { passage, questions }
Text Paste:   Study page → (no API call)    → studyAnalyzeAction() → { passage, questions }
```

**Key points:**
- `/api/upload` and `/api/upload/text` return `{ text, title }` only — no AI calls
- `studyAnalyzeAction({ text, title })` is the sole analysis entry point
- Text paste skips the API entirely, calls `studyAnalyzeAction` directly from client

---

## Flow A: File Upload via Study Page (`/study`)

### A1. Happy Path — TXT File

**Steps:**
1. Navigate to `/study`
2. Ensure "Upload File" tab is active (default)
3. Drop or select a `.txt` file containing 50+ words of English text
4. Observe loading spinner ("Analyzing content...")
5. Verify left panel shows passage with title, word count, CEFR badge, reading time
6. Verify original/simplified toggle appears (if level ≥ B1)
7. Verify right panel shows comprehension questions with options

**Expected API calls:**
```
POST /api/upload          → 200 { success: true, data: { text: "...", title: "filename" } }
Server Action: studyAnalyzeAction  → { passage: {...}, questions: [...] }
```

**Assertions:**
- Passage `title` = filename without extension, underscores/hyphens replaced with spaces
- Passage `content` matches original file text
- `originalLevel` is a valid CEFR level (A1–C2) or null
- `simplifiedContent` exists if `originalLevel` is B1+ (or null if simplification failed)
- `questions` array has 1–5 items, each with `options` (non-empty), `correctAnswer`, `explanation`
- `wordCount` matches actual word count of input text

### A2. Happy Path — PDF File

**Steps:** Same as A1, but upload a `.pdf` file.

**Additional assertions:**
- PDF text extraction succeeds (compare extracted `text` with expected PDF content)
- Multi-page PDFs are concatenated correctly

### A3. Edge Case — File with < 50 Words

**Steps:**
1. Upload a `.txt` file with fewer than 50 words (e.g., "Hello world. This is a test.")

**Expected:**
```
POST /api/upload → 400 { error: "Extracted text is too short (minimum 50 words)" }
```
- Client shows error alert with the error message
- State returns to idle upload UI

### A4. Edge Case — File Too Large (> 10MB)

**Steps:**
1. Attempt to upload a file > 10MB

**Expected:**
- Client-side: `react-dropzone` rejects file before API call
- Error displayed in `UploadZone`: "File size exceeds 10MB limit"
- No API request made

### A5. Edge Case — Unsupported File Type

**Steps:**
1. Attempt to upload a `.docx`, `.png`, `.csv`, etc.

**Expected:**
- Client-side: `react-dropzone` rejects file
- Error displayed: "Only .txt and .pdf files are supported"
- No API request made

### A6. Edge Case — Empty File

**Steps:**
1. Upload a 0-byte `.txt` file

**Expected:**
```
POST /api/upload → 400 { error: "Extracted text is too short (minimum 50 words)" }
```

### A7. Edge Case — File with Non-UTF8 Content

**Steps:**
1. Upload a `.txt` file with binary/random bytes

**Expected:**
- Extracted text may be garbled
- If word count < 50 → 400 error
- If word count ≥ 50 → may pass through (garbled text reaches AI)

---

## Flow B: Text Paste via Study Page (`/study`)

### B1. Happy Path — Valid Text

**Steps:**
1. Navigate to `/study`
2. Click "Paste Text" tab
3. Paste 50+ characters of English text into textarea
4. Click "Continue" button
5. Observe loading spinner
6. Verify passage and questions appear

**Expected:**
- No API call to `/api/upload/text` (text goes directly to `studyAnalyzeAction`)
- `title` = "Pasted Text"
- Same analysis results as file upload

**Assertions:**
- Same as A1 assertions
- Word counter in textarea footer updates in real-time

### B2. Edge Case — Too Short (< 50 chars)

**Steps:**
1. Type fewer than 50 characters (e.g., "Hello")
2. Click "Continue"

**Expected:**
- Client-side validation catches it (in `TextInputArea` component)
- Error displayed: "Text is too short (minimum 50 characters)"
- No server action call

### B3. Edge Case — Too Long (> 100,000 chars)

**Steps:**
1. Paste > 100,000 characters
2. Click "Continue"

**Expected:**
- Client-side validation: "Text is too long (maximum 100,000 characters)"

### B4. Edge Case — Empty Text

**Steps:**
1. Leave textarea empty
2. "Continue" button is disabled
3. If somehow submitted: validation error "Text content is empty"

### B5. Edge Case — Whitespace Only

**Steps:**
1. Enter only spaces/tabs/newlines
2. Click "Continue"

**Expected:**
- Validation trims input → "Text content is empty"

---

## Flow C: API-Level Tests (Direct HTTP)

### C1. POST /api/upload — No File

```bash
curl -X POST http://localhost:3000/api/upload
# Expected: 400 { "error": "No file provided" }
```

### C2. POST /api/upload — Valid TXT

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@test-content.txt"
# Expected: 200 { "success": true, "data": { "text": "...", "title": "test-content" } }
```

### C3. POST /api/upload — Oversized File

```bash
# Create 11MB file
dd if=/dev/zero bs=1M count=11 | tr '\0' 'a' > large.txt
curl -X POST http://localhost:3000/api/upload -F "file=@large.txt"
# Expected: 400 { "error": "File size exceeds 10MB limit" }
```

### C4. POST /api/upload/text — Missing Text

```bash
curl -X POST http://localhost:3000/api/upload/text \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 400 { "error": "Text content is required" }
```

### C5. POST /api/upload/text — Valid Text

```bash
curl -X POST http://localhost:3000/api/upload/text \
  -H "Content-Type: application/json" \
  -d '{"text": "This is a sufficiently long piece of English text that exceeds fifty characters for validation purposes.", "title": "Test"}'
# Expected: 200 { "success": true, "data": { "text": "...", "title": "Test" } }
```

### C6. POST /api/upload/text — Non-string Text

```bash
curl -X POST http://localhost:3000/api/upload/text \
  -H "Content-Type: application/json" \
  -d '{"text": 123}'
# Expected: 400 { "error": "Text content is required" }
```

---

## Flow D: Old Routes — Redirect Behavior

### D1. /upload Page Redirects to /study

**Steps:**
1. Navigate to `/upload`

**Expected:**
- Server-side redirect (302) to `/study`
- Study page renders with upload UI

### D2. External Links Updated

Verify these components no longer link to `/upload`:
- `src/components/progress-dashboard.tsx` — "Start Review" and "Add New Content" buttons → `/study`
- `src/app/(dashboard)/test/[id]/flashcard-test-client.tsx` — "New Passage" → `/study`

---

## Validation Rules Reference

### File Validation (`validateFile`)

| Check | Rule | Error Message |
|-------|------|---------------|
| Size | ≤ 10MB (10,485,760 bytes) | "File size exceeds 10MB limit" |
| Type | `text/plain` or `application/pdf` MIME, or `.txt`/`.pdf` extension | "Only .txt and .pdf files are supported" |

### Text Validation (`validateTextContent`)

| Check | Rule | Error Message |
|-------|------|---------------|
| Empty | Trimmed length === 0 | "Text content is empty" |
| Min length | Trimmed length < 50 | "Text is too short (minimum 50 characters)" |
| Max length | Trimmed length > 100,000 | "Text is too long (maximum 100,000 characters)" |

### Post-Extraction Validation (upload route only)

| Check | Rule | Error Message |
|-------|------|---------------|
| Word count | < 50 words after extraction | "Extracted text is too short (minimum 50 words)" |

---

## Response Shapes

### POST /api/upload — Success

```json
{
  "success": true,
  "data": {
    "text": "Full extracted text content...",
    "title": "filename without extension"
  }
}
```

### POST /api/upload/text — Success

```json
{
  "success": true,
  "data": {
    "text": "Submitted text content",
    "title": "Provided title or 'Untitled'"
  }
}
```

### Error Response (both routes)

```json
{
  "error": "Human-readable error message"
}
```

Status codes: `400` (validation), `500` (server error).

---

## Files Under Test

| File | Role |
|------|------|
| `src/app/api/upload/route.ts` | File upload → text extraction |
| `src/app/api/upload/text/route.ts` | Text validation endpoint |
| `src/lib/validation/upload.ts` | `validateFile()`, `validateTextContent()` |
| `src/lib/parsers/pdf.ts` | `parsePDF()` |
| `src/app/actions/analyze.ts` | `studyAnalyzeAction()` — AI pipeline + DB |
| `src/app/(dashboard)/study/study-left-panel.tsx` | Client upload/paste UI |
| `src/app/(dashboard)/study/study-page-client.tsx` | State management, calls `studyAnalyzeAction` |
| `src/components/upload-zone.tsx` | Drag-and-drop file upload component |
| `src/components/text-input-area.tsx` | Text paste component |

---

## Test Data Suggestions

### Valid English Text (50+ words)

```
The quick brown fox jumps over the lazy dog. This sentence contains every letter of the English alphabet and has been used as a typing test for many years. In modern applications, it serves as a simple way to verify that text rendering and processing systems are working correctly. Developers often use this pangram to test fonts, keyboards, and text input fields across different platforms and devices. The phrase first appeared in the late 19th century and has remained popular ever since.
```

### Valid English Text (B2+ level, triggers simplification)

```
The unprecedented proliferation of artificial intelligence technologies has precipitated a fundamental paradigm shift in numerous industries, particularly in the realm of natural language processing. Researchers have demonstrated that sophisticated neural architectures can achieve remarkable performance on complex linguistic tasks, including machine translation, sentiment analysis, and automated text summarization. These advancements necessitate a careful examination of the ethical implications and potential societal consequences of deploying such systems at scale.
```

### Minimal Valid Text (exactly 50 characters)

```
This text is exactly fifty characters long for test!
```

### Below Minimum (< 50 characters)

```
Too short
```

---

**Status:** Active
**Last Updated:** 2026-05-02
