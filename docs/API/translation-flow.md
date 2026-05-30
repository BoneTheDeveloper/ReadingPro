# Translation Flow

Inline translation on `/study` supports English selections with Vietnamese output. Learners select visible reader text, see a floating translate icon, click it to get a quick popup, optionally open the Translate Studio panel, and can save the selection to vocabulary from the detailed view.

## Endpoints

### POST `/api/translate`

Request:

```ts
{
  text: string;              // 1-500 chars
  context: string;           // 1-4000 chars, usually surrounding sentence/paragraph
  sourceId: string;          // owned Passage id
  sourceLanguage: "en";
  targetLanguage: "vi";
  mode: "quick" | "detailed";
}
```

Success response:

```ts
{ success: true, data: QuickTranslation | DetailedTranslation }
```

Quick mode returns:

```ts
{
  translation: string;
  type: string | null;
  provider: "cache" | "dictionary" | "fallback" | "google_translate";
}
```

Detailed mode returns:

```ts
{
  translation: string;
  explanation: string;
  meaningInSentence: string | null;
  sentenceTranslation: string;
  examples: string[];
  relatedWords: string[];
  pronunciation: string | null;
  type: string | null;
  provider: "cache" | "ai";
}
```

Failure responses use `{ error: string }` with `400` for invalid JSON/body, `401` for missing auth, `404` for inaccessible sources, and `500` for unexpected failures.

### POST `/api/vocabulary`

Request:

```ts
{
  sourceId: string;
  selectedText: string;      // 1-500 chars
  translation: string;       // 1-500 chars
  contextSentence: string;   // 1-4000 chars
  sourceLanguage: "en";
  targetLanguage: "vi";
  type?: string;
}
```

The route upserts a `VocabularyItem` using a hash of `userId`, `sourceId`, selected text, context sentence, and target language. Re-saving the same selection reuses the same row.

### Dictionary Lookup

`GET /api/dictionary` and `GET /api/dictionary/suggest` expose the local dictionary for exact lookup and suggest search. These endpoints are separate from Study quick translate, which uses the same dictionary table internally.

## Quick Mode Contract

Quick mode must not call AI. It resolves in this order:

1. Exact translation cache hit → return `provider: "cache"`.
2. Cache miss → classify selection scope:
   - **Dictionary scope** (single word or short phrase, ≤4 tokens, no sentence-ending punctuation): contextual dictionary lookup, including phrases containing the selected word, ranked by phrase/context/confidence, with deterministic fallback from token translations or normalized selected text. Returns `provider: "dictionary"` or `"fallback"`.
   - **Machine scope** (sentence, paragraph, or longer phrase): non-AI machine translation provider (Google Translate-compatible endpoint). Returns `provider: "google_translate"`.
3. All results are persisted in cache and history.

Punctuation normalization strips surrounding punctuation from context tokens so that a selection like `bias` in context `algorithmic bias.` still matches the dictionary phrase `algorithmic bias`.

Seeded test coverage includes `algorithmic bias`, contextual `bias`, `algorithm`, `data`, and unknown `quorvex drift`.

## Detailed Mode Contract

Detailed mode checks the same cache first. On cache miss, it calls the translation AI model and stores the detailed response in cache and history. Ask AI from the Translate panel only prefills chat; it does not send the chat message automatically.

## Manual Translate Trigger

Study reader selection capture and translation execution are separated:

- Highlighting text captures the selection and renders a floating translate icon.
- Clicking the translate icon triggers the quick `/api/translate` request.
- Double-click selection is deduplicated (same selection within 300ms is ignored).
- The quick popup does not include a Save vocabulary action. Vocabulary save is available from the detailed Translate Studio panel.

## Non-AI Translation Provider

Quick sentence/paragraph translation uses a Google Translate-compatible public endpoint. No API key is required. If the provider fails, the route returns the standard `500` error without falling back to AI.

## Dictionary Seed

The dictionary seed script is at `prisma/seed-dictionary.ts`. Run it explicitly after migrations:

```sh
pnpm db:seed:dictionary
```

This script is idempotent (uses upsert). It requires `DIRECT_URL` or `DATABASE_URL` to be configured. Do not run it automatically during `next build`.

## Observability

Routes use `createRequestLogger()` and `createRequestLogContext()`. Spans cover auth, source lookup, cache lookup, dictionary lookup, non-AI provider call, AI generation, cache write, history append, and vocabulary upsert. UI breadcrumbs cover selection capture, quick/detailed translation requests, details opened, vocabulary save, and Ask AI opened.

Logs and Sentry metadata must avoid raw selected text and raw context. Record lengths, source id, target language, mode, provider, cache hit state, and result status instead.

## V1 Boundaries

V1 intentionally excludes a custom right-click menu, a translation history viewer, flashcard generation from vocabulary, pronunciation audio, and target-language selection beyond Vietnamese.
