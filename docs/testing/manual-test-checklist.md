# Manual Test Checklist — Upload Flow E2E

Run the dev server (`pnpm dev`) before testing. Work through each section.

---

## Flow A: File Upload (`/study` → Upload File tab)

### A1. Valid TXT — Simple English (A1/A2 level)
- [ ] Open http://localhost:3000/study
- [ ] Upload `test-files/valid-a1-simple.txt`
- [ ] Left panel shows passage title "valid a1 simple"
- [ ] Word count badge visible
- [ ] CEFR level badge shows A1 or A2
- [ ] Original/simplified toggle: **should NOT appear** (A1/A2 not simplified)
- [ ] Right panel shows comprehension questions (1-5 items)
- [ ] Questions have clickable options

### A2. Valid TXT — Complex English (C1 level)
- [ ] Upload `test-files/valid-c1-complex.txt`
- [ ] Left panel shows passage title "valid c1 complex"
- [ ] CEFR level badge shows C1 or B2
- [ ] Original/simplified toggle: **should appear** (level ≥ B1)
- [ ] Click "Original" → shows original text with original level
- [ ] Click "Simplified" → shows simplified text with lower level
- [ ] Right panel shows questions based on simplified content

### A3. File Too Short (< 50 words)
- [ ] Upload `test-files/too-short-10-words.txt`
- [ ] Error alert appears: "Extracted text is too short (minimum 50 words)"
- [ ] Upload UI returns to idle state
- [ ] No loading spinner for analysis

### A4. File Too Large (> 10MB)
- [ ] Create a file > 10MB: `dd if=/dev/zero bs=1M count=11 | tr '\0' 'a' > /tmp/large.txt`
- [ ] Try to upload `/tmp/large.txt`
- [ ] Dropzone shows error: "File size exceeds 10MB limit"
- [ ] No API request is sent (check browser Network tab)

### A5. Unsupported File Type
- [ ] Rename `test-files/rename-me-to-png.txt` → `.png`
- [ ] Try to upload the .png file
- [ ] Dropzone shows error: "Only .txt and .pdf files are supported"
- [ ] No API request sent

### A6. PDF Upload
- [ ] Upload any PDF with 50+ words of English text
- [ ] Text extraction succeeds
- [ ] Title = filename without .pdf extension
- [ ] Same analysis flow as TXT (passage + questions)

---

## Flow B: Text Paste (`/study` → Paste Text tab)

### B1. Valid Text Paste
- [ ] Click "Paste Text" tab
- [ ] Paste content of `test-files/valid-a1-simple.txt` into textarea
- [ ] Word counter updates (should show ~65 words)
- [ ] Click "Continue"
- [ ] Loading spinner appears ("Analyzing content...")
- [ ] Left panel shows passage with title "Pasted Text"
- [ ] Right panel shows questions

### B2. Too Short (< 50 chars)
- [ ] Clear textarea
- [ ] Type: "Too short"
- [ ] Click "Continue"
- [ ] Error appears: "Text is too short (minimum 50 characters)"
- [ ] No analysis spinner

### B3. Empty Text
- [ ] Clear textarea completely
- [ ] "Continue" button is **disabled**
- [ ] Cannot submit

### B4. Whitespace Only
- [ ] Type only spaces/newlines
- [ ] Click "Continue" (button should still be disabled — if not, expect validation error)

---

## Flow C: API Direct (curl)

Run these in terminal, verify response shapes.

### C1. POST /api/upload — no file
```bash
curl -s -X POST http://localhost:3000/api/upload | jq .
```
- [ ] Returns `400` with `{ "error": "No file provided" }`

### C2. POST /api/upload — valid TXT
```bash
curl -s -X POST http://localhost:3000/api/upload \
  -F "file=@docs/testing/test-files/valid-a1-simple.txt" | jq .
```
- [ ] Returns `200` with `{ "success": true, "data": { "text": "...", "title": "valid-a1-simple" } }`
- [ ] `text` is non-empty string
- [ ] `title` = "valid-a1-simple" (underscores become spaces? No — the API does `replace(/[_-]/g, ' ')` so "valid-a1-simple")

### C3. POST /api/upload/text — missing text
```bash
curl -s -X POST http://localhost:3000/api/upload/text \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```
- [ ] Returns `400` with `{ "error": "Text content is required" }`

### C4. POST /api/upload/text — valid text
```bash
curl -s -X POST http://localhost:3000/api/upload/text \
  -H "Content-Type: application/json" \
  -d '{"text":"This is a sufficiently long piece of English text that exceeds the fifty character minimum for validation purposes and testing.","title":"Test Title"}' | jq .
```
- [ ] Returns `200` with `{ "success": true, "data": { "text": "...", "title": "Test Title" } }`

### C5. POST /api/upload/text — too short
```bash
curl -s -X POST http://localhost:3000/api/upload/text \
  -H "Content-Type: application/json" \
  -d '{"text":"Hi"}' | jq .
```
- [ ] Returns `400` with `{ "error": "Text is too short (minimum 50 characters)" }`

### C6. POST /api/upload/text — default title
```bash
curl -s -X POST http://localhost:3000/api/upload/text \
  -H "Content-Type: application/json" \
  -d '{"text":"This is a sufficiently long piece of English text that exceeds the fifty character minimum for validation purposes and testing."}' | jq .
```
- [ ] Returns `200` with `title: "Untitled"` (no title provided)

---

## Flow D: Redirects

### D1. /upload redirects to /study
- [ ] Open http://localhost:3000/upload
- [ ] Page redirects to `/study`
- [ ] Study page renders normally

### D2. Progress dashboard links
- [ ] Open http://localhost:3000/progress
- [ ] "Add New Content" button links to `/study` (not `/upload`)
- [ ] If streak reminder shown, "Start Review" links to `/study`

---

## Test Files Key

| File | Purpose | Expected Result |
|------|---------|-----------------|
| `valid-a1-simple.txt` | 65 words, simple English | Passes — A1/A2 level, no simplification |
| `valid-c1-complex.txt` | 130 words, academic English | Passes — C1/B2 level, simplification triggered |
| `too-short-10-words.txt` | 2 words only | Rejected — "too short (minimum 50 words)" |
| `exactly-50-chars.txt` | Exactly 50 characters | Passes validation (50 chars ≥ 50 min) |
| `rename-me-to-png.txt` | Valid text, wrong extension | Rename to .png → rejected by file type check |
