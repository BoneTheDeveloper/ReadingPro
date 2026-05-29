# Translation Flow

Inline translation on `/study` supports English selections with Vietnamese output. Learners select visible reader text, get a quick popup, optionally open the Translate Studio panel, and can save the selection to vocabulary.

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
  provider: "cache" | "dictionary" | "fallback";
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

1. Exact translation cache hit.
2. Contextual dictionary lookup, including phrases containing the selected word.
3. Ranked candidate selection by phrase/context/confidence.
4. Deterministic fallback from token translations or normalized selected text.

Seeded test coverage includes `algorithmic bias`, contextual `bias`, `algorithm`, `data`, and unknown `quorvex drift`.

## Detailed Mode Contract

Detailed mode checks the same cache first. On cache miss, it calls the translation AI model and stores the detailed response in cache and history. Ask AI from the Translate panel only prefills chat; it does not send the chat message automatically.

## Observability

Routes use `createRequestLogger()` and `createRequestLogContext()`. Spans cover auth, source lookup, cache lookup, dictionary lookup, AI generation, cache write, history append, and vocabulary upsert. UI breadcrumbs cover selection capture, quick/detailed translation requests, details opened, vocabulary save, and Ask AI opened.

Logs and Sentry metadata must avoid raw selected text and raw context. Record lengths, source id, target language, mode, provider, cache hit state, and result status instead.

## V1 Boundaries

V1 intentionally excludes a custom right-click menu, a translation history viewer, flashcard generation from vocabulary, pronunciation audio, and target-language selection beyond Vietnamese.
