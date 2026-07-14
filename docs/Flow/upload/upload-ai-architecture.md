# Upload AI Architecture — Target Design

> **Doc scope:** This is the **target architecture** document.
> For the current implementation, see [Upload Data Flow](./upload-data-flow.md).
> For UI rendering flow, see [Upload Render Flow](./upload-render-flow.md).

## Overview

This doc defines the target architecture for a full AI-powered upload pipeline
that enriches every passage with meaningful metadata.

**Pipeline stages:**
```
Intake → Validate → Normalize → AI Analysis → Metadata Store → Notify
```

---

## Processing Pipeline

### Stage 1: Intake

Accept content from multiple sources.

| Source | Method | Status | Notes |
|--------|--------|--------|-------|
| `paste` | Inline text | ✅ Done | No storage needed |
| `txt` | File upload | ✅ Done | Store raw file |
| `pdf` | File upload | ✅ Done | Store + parse |
| `youtube` | URL | ⏳ Placeholder | Fetch transcript (TODO) |
| `url` | (future) | ⏳ Placeholder | Scrape + parse |
| `image` | (future) | ⏳ Placeholder | OCR + parse |

### Stage 2: Validate

Pre-processing validation.

| Check | Status | Description |
|-------|--------|-------------|
| File type | ✅ Done | `txt`, `pdf` only (ext + MIME) |
| File size | ✅ Done | Max 10MB |
| Text length | ✅ Done | 50 – 100,000 chars |
| Auth | ✅ Done | User authenticated |
| Title | ✅ Done | Non-empty, sanitized |

### Stage 3: Normalize

Clean and standardize text before AI analysis.

| Operation | Status | Description |
|-----------|--------|-------------|
| Whitespace | ✅ Done | Collapse multiple spaces/newlines |
| Encoding | ✅ Done | Normalize UTF-8 |
| PDF artifacts | ⏳ Placeholder | Remove headers, footers, page numbers |
| Control chars | ✅ Done | Strip `\r`, `\f` |
| Empty lines | ✅ Done | Trim leading/trailing |

**Current implementation:** Basic cleanup in `parsePDF` + worker steps.
**Target:** Dedicated `text-normalizer.ts`

### Stage 4: AI Analysis

Full content analysis per passage.

| Analysis | Status | Output |
|----------|--------|--------|
| **CEFR level** | ⏳ Placeholder | `A1` / `A2` / `B1` / `B2` / `C1` / `C2` |
| **Vocabulary extraction** | ⏳ Placeholder | List of key vocabulary words |
| **Topic/concept tags** | ⏳ Placeholder | Categories, themes, keywords |

**Placeholder approach:** Hardcoded defaults + async functions ready for real implementation.

---

## Service Architecture

### File Structure (planned)

```
src/features/upload/
├── actions.ts                              # Stage 1-2: intake + validate
│                                             (current: calls Inngest directly)
├── schemas/                               # Validation schemas (current)
├── services/
│   ├── normalizers/
│   │   ├── text-normalizer.ts    # Core text normalization
│   │   └── pdf-normalizer.ts     # PDF-specific cleanup
│   ├── analyzers/                         # AI analysis services
│   │   ├── cefr-detector.ts       # CEFR level detection
│   │   │                                    - placeholder: returns "B2"
│   │   ├── vocabulary-extractor.ts # Vocabulary extraction
│   │   │                                    - placeholder: returns []
│   │   └── topic-tagger.ts        # Topic/concept tagging
│   │                                        - placeholder: returns []
│   └── upload-processor.ts        # Pipeline orchestrator
│                                             - orchestrates all stages
│
src/services/ai/                          # AI service layer (current: minimal)
├── prompts/                               # AI prompts per analysis type
├── model-config.ts                        # Model configuration
└── prompt-utils.ts                        # Prompt utilities

src/services/inngest/
├── client.ts                              # Inngest client + event schemas
└── functions/
    └── process-upload.ts                 # Background worker (thin orchestrator)
                                              - calls upload-processor
```

### Service Design

#### Placeholder Pattern

All unimplemented services follow this pattern:

```typescript
// Placeholder: returns hardcoded default, async for future implementation
export async function analyzeWithAI(
  text: string,
): Promise<AnalysisResult> {
  // TODO: Implement real AI analysis
  return {
    cefrLevel: "B2",      // Hardcoded default
    vocabulary: [],       // Placeholder
    topics: [],           // Placeholder
  };
}
```

#### Pipeline Orchestrator

```typescript
// upload-processor.ts
export async function processUpload(
  input: UploadInput,
): Promise<ProcessedPassage> {
  // 1. Validate (already done in action, but service can re-validate)
  validateInput(input);

  // 2. Resolve text from source
  const text = await resolveText(input);

  // 3. Normalize
  const normalizedText = await normalizeText(text);

  // 4. AI Analysis (placeholder for now)
  const analysis = await analyzeWithAI(normalizedText);

  // 5. Create passage with metadata
  const passage = await createPassage({
    ...input,
    content: normalizedText,
    ...analysis,
  });

  return passage;
}
```

### Current → Target Migration

**Current worker** (`process-upload.ts`):
- Inline steps: resolve text, hardcoded CEFR, create passage
- Direct Prisma calls in each step

**Target worker**:
- Thin orchestrator, calls `upload-processor`
- Services handle business logic
- Testable, replaceable components

---

## Implementation Roadmap

| Phase | Items | Status | Notes |
|-------|-------|--------|-------|
| 1 | Complete upload types | Partial | YouTube placeholder |
| 2 | Text normalization | Partial | Basic cleanup done, PDF artifacts TODO |
| 3 | Service reorganization | ✅ Done | `services/` structure created |
| 4 | AI CEFR detection | Placeholder | Returns "B2", ready for AI |
| 5 | Vocabulary extraction | Placeholder | Returns [], ready for AI |
| 6 | Topic/concept tagging | Placeholder | Returns [], ready for AI |
| 7 | Quality scoring | Future | |
| 8 | Duplicate detection | Future | |

---

## Migration Notes (Phase 4 Complete)

As of this implementation:
- [x] `services/` directory created with normalizers and analyzers
- [x] `upload-processor.ts` orchestrates pipeline
- [x] Worker refactored to use pipeline orchestrator
- [ ] YouTube transcript fetch (Phase 1)
- [ ] AI CEFR detection (Phase 4)
- [ ] Vocabulary extraction (Phase 5)
- [ ] Topic tagging (Phase 6)

---

## API Contracts

### Upload Input

```typescript
interface UploadInput {
  passageId: string;      // Client-generated UUID
  title: string;
  sourceType: "paste" | "txt" | "pdf" | "youtube";
  text?: string;          // paste
  blobPath?: string;      // txt, pdf
  url?: string;           // youtube
  startedAt: number;       // Client timestamp
}
```

### Processed Passage Output

```typescript
interface ProcessedPassage {
  id: string;
  title: string;
  content: string;
  sourceType: "TEXT" | "PDF";
  wordCount: number;
  cefrLevel: string;           // Currently hardcoded "B2"
  vocabulary: string[];         // Currently []
  topics: string[];            // Currently []
  filePath?: string;
  createdAt: Date;
}
```

---

## Open Questions

- [ ] Stage 5 metadata schema design
- [ ] Migration path from current Passage model
- [ ] AI analysis cost estimation
- [ ] Retry strategy for AI failures
- [ ] Batch vs streaming for large passages
