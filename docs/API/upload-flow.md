# Upload & Content Analysis Flow

## Flow Diagram

```mermaid
flowchart TD
    A[User Input] --> B[API Route]
    A --> C[Server Action]
    
    B --> D[File Upload<br>POST /api/upload]
    B --> E[Text Upload<br>POST /api/upload/text]
    C --> F[Study Page<br>studyAnalyzeAction]
    
    D --> G[validateFile()]
    D --> H[parsePDF() PDF?]
    D --> I[word count check]
    
    E --> J[validateTextContent()]
    
    G --> K
    H --> K
    I --> K
    J --> K
    F --> K
    
    K --> L[AI Pipeline]
    
    L --> M[CEFR Detection<br>AI → heuristic fallback]
    L --> N[Simplification<br>if level ≥ B1]
    L --> O[Question Generation<br>5 questions]
    
    M --> P
    N --> P
    O --> P
    
    P --> Q[DB: create passage + questions]
    
    Q --> R[Output<br>{ passageId, levels, questionCount }]
    Q --> S[Output<br>{ passage, questions[] }]
    
    style A fill:#e1f5fe
    style L fill:#fff3e0
    style Q fill:#e8f5e8
    style R fill:#f3e5f5
    style S fill:#f3e5f5
```

---

## Entry Points

| Entry | File | Input | Output |
|-------|------|-------|--------|
| File upload | `src/app/api/upload /route.ts` | `FormData` with `file` field | `{ passageId, levels, questionCount }` |
| Text upload | `src/app/api/upload /text/route.ts` | JSON `{ text, title? }` | `{ passageId, levels, questionCount }` |
| Upload page action | `src/app/actions/analyze.ts` → `analyzeContentAction()` | `FormData` with `text`, `title` | `{ passageId, originalLevel, simplifiedLevel, questionCount }` |
| Study page action | `src/app/actions/analyze.ts` → `studyAnalyzeAction()` | `{ text: string, title: string }` | `{ passage, questions[] }` |

> **Note:** Upload directory has a trailing space in filename: `"upload /"`. This is a known issue.

---

## Processing Pipeline (shared by all entry points)

### Step 1: Validation

| Check | Limit | Source |
|-------|-------|--------|
| Min text length | 50 chars | `src/lib/upload-validator.ts` → `validateTextContent()` |
| Max text length | 100,000 chars | `src/lib/upload-validator.ts` |
| File size | 10 MB | `src/lib/upload-validator.ts` → `validateFile()` |
| File types | `.txt`, `.pdf` | `src/lib/upload-validator.ts` |
| Min word count (after extract) | 50 words | Upload route inline check |

### Step 2: CEFR Level Detection

- **Primary:** AI model (`gemini-1.5-flash`) via `generateObject()` with `cefrAnalysisSchema`
- **Fallback:** Heuristic algorithm `getHeuristicCEFR()` if AI fails
- **Source:** `src/lib/ai/cefr-detector.ts`
- **Input:** First 2,000 chars of text (AI), full text (heuristic)
- **Output:** CEFR level (`A1`–`C2`)

### Step 3: Content Simplification (conditional)

- **Trigger:** Only if `originalLevel` is `B1`, `B2`, `C1`, or `C2`
- **Target level mapping:** C2→C1, C1→B2, B2→B1, B1→A2
- **AI model:** `gemini-1.5-flash` with `simplifiedContentSchema`
- **Fallback:** Skips simplification on failure, uses original text
- **Source:** `src/lib/ai/content-simplifier.ts`

### Step 4: Question Generation

- **Input:** Simplified content (if available) or original text, max 10,000 chars
- **Output:** 5 comprehension questions
- **AI model:** `gemini-1.5-flash` with `questionGenerationSchema`
- **Fallback:** Returns empty questions array on failure
- **Source:** `src/lib/ai/question-generator.ts`

Each question has:
```ts
{
  questionText: string;
  options: { id: string; text: string }[];
  correctAnswer: string;     // option id
  sourceText: string;        // passage excerpt
  sourceLine: number;
  explanation: string;
  questionType: string;
  difficulty: string;
}
```

### Step 5: Database Storage

- Upsert demo user (`demo@example.com`)
- Create `Passage` record with all metadata
- Create `Question` records (nested via Prisma `create`)
- **Source:** `src/app/actions/analyze.ts` → `db.passage.create()`
- **Schema:** `src/lib/db.ts` (Prisma client)

---

## File Map

```
src/
├── app/
│   ├── api/
│   │   └── upload /                    # Note: trailing space in dirname
│   │       ├── route.ts                # POST /api/upload (file upload)
│   │       ├── text/route.ts           # POST /api/upload/text (raw text)
│   │       └── text-route.ts           # Legacy alternative text route
│   └── actions/
│       └── analyze.ts                  # analyzeContentAction(), studyAnalyzeAction()
├── lib/
│   ├── upload-validator.ts             # validateFile(), validateTextContent()
│   ├── pdf-parser.ts                   # parsePDF() - PDF text extraction
│   ├── db.ts                           # Prisma client instance
│   ├── db-utils.ts                     # createPassage(), getOrCreateUser()
│   └── ai/
│       ├── cefr-detector.ts            # AI + heuristic CEFR detection
│       ├── content-simplifier.ts       # AI content simplification
│       └── question-generator.ts       # AI question generation
```
