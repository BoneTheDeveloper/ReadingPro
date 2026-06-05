# Upload API Feature

## Endpoints

### File Upload API

#### 1. Purpose

Upload a `.txt` or `.pdf` file, extract text, analyze reading level, optionally
simplify content, generate comprehension questions, and persist a passage.

#### 2. Method + path

```http
POST /api/upload
```

#### 3. Request input

FormData:

```ts
{
  file: File;                // .txt or .pdf, max 10 MB
}
```

#### 4. Success response

```ts
{
  success: true;
  data: FileUploadResult;
}
```

`FileUploadResult`:

```ts
{
  passageId: string;
  originalLevel: string;
  simplifiedLevel: string | null;
  questionCount: number;
}
```

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Missing file, invalid file type, file too large, or invalid extracted text |
| `401` | Missing auth |
| `500` | Storage, parsing, analysis, or persistence failure |

#### 6. Notes about cache / auth / boundaries

- Route requires authenticated user.
- Accepts `.txt` and `.pdf` files.
- File size limit is 10 MB.
- Extracted text must be 50-100,000 chars.
- Uploaded storage file is deleted if later processing fails.
- No client or server cache is expected.

### Text Upload API

#### 1. Purpose

Submit raw text directly, analyze reading level, optionally simplify content,
generate comprehension questions, and persist a passage.

#### 2. Method + path

```http
POST /api/upload/text
```

#### 3. Request input

Request body:

```ts
{
  text: string;              // 50-100,000 chars, validated via Zod schema
  title?: string;            // defaults to "Untitled"
}
```

#### 4. Success response

```ts
{
  success: true;
  data: ContentAnalysisResult;
}
```

`ContentAnalysisResult`:

```ts
{
  passageId: string;
  originalLevel: string;
  simplifiedLevel: string | null;
  questionCount: number;
}
```

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Missing text, invalid text length, malformed JSON, or invalid text content |
| `401` | Missing auth |
| `500` | Analysis or persistence failure |

#### 6. Notes about cache / auth / boundaries

- Route requires authenticated user.
- Text must be 50-100,000 chars after trimming.
- Title defaults to `"Untitled"` when omitted.
- Source type is stored as `TEXT`.
- No client or server cache is expected.

## Server Logic

### Step 1: Validation

| Check | Limit |
|-------|-------|
| Min text length | 50 chars |
| Max text length | 100,000 chars |
| File size | 10 MB |
| File types | `.txt`, `.pdf` |

### Step 2: CEFR Level Detection

- **Primary:** heuristic CEFR scoring.
- **Input:** Truncated text for analysis.
- **Output:** CEFR level (`A1`–`C2`)

### Step 3: Content Simplification (conditional)

- **Trigger:** Only if `originalLevel` is `B1`, `B2`, `C1`, or `C2`
- **Target level mapping:** C2→C1, C1→B2, B2→B1, B1→A2
- **Fallback:** Skips simplification on failure, uses original text

### Step 4: Question Generation

- **Input:** Simplified content (if available) or original text, max 10,000 chars
- **Output:** 5 comprehension questions
- **Fallback:** Returns empty questions array on failure

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

- Use authenticated user id.
- Create `Passage` record with all metadata
- Create `Question` records (nested via Prisma `create`)
