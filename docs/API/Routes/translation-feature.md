# Inline Translation API Feature

Inline translation APIs provide fast English-to-Vietnamese translation for
selected reader text and let the user save successful translations as
vocabulary.

`POST /api/translate` is one public route. The backend automatically detects
which runtime path to use from the selected text. Clients do not send a
translation `mode`.

The route has two runtime paths, named by input type:

1. **Word translate path** resolves a word or short phrase (≤4 tokens, ≤40
   chars, no newline, no sentence-ending punctuation).
2. **Sentence translate path** resolves a sentence or paragraph.

Dictionary search, suggestions, and entry detail behavior are separate. See
[dictionary-feature.md](./dictionary-feature.md).

## Scope

In scope:

- Accept word, short phrase, sentence, or paragraph text selected from a passage.
- Auto-detect the selected text shape on the backend.
- Resolve word / short phrase selections through the word translate path.
- Resolve sentence / paragraph selections through the sentence translate path.
- Save successful translations through `POST /api/vocabulary`.

Out of scope:

- Dictionary search and autocomplete UX.
- Detailed translation mode.
- Client-selected translation mode.
- Translation history viewer.
- Persisting client cache to `localStorage` or IndexedDB.
- Target-language selection beyond Vietnamese.
- Custom right-click menu.
- Pronunciation audio.

## Endpoints

### Inline Translation API

#### 1. Purpose

Fast inline English-to-Vietnamese translation for selected study reader text.
The backend chooses the path automatically by classifying the input text. It
does not expose dictionary search, autocomplete, entry detail, or detailed
translation mode.

#### 2. Method + path

```http
POST /api/translate
```

#### 3. Request input

Request body:

```ts
{
  text: string;              // 1-500 chars
  context: string;           // 1-4000 chars, usually surrounding sentence/paragraph
  sourceId: string;          // owned Passage id
  sourceLanguage: "en";
  targetLanguage: "vi";
}
```

No `mode` field is accepted by this API contract. The backend classifies the
selection and routes it to the correct internal runtime path.

#### 4. Success response

```ts
{
  success: true;
  data: TranslationResult;
}
```

`TranslationResult`:

```ts
{
  translation: string;
  type: string | null;
  provider: "cache" | "dictionary" | "fallback" | "google_translate";
}
```

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid JSON/body |
| `401` | Missing auth |
| `404` | Inaccessible source |
| `500` | Unexpected failure or provider failure |

#### 6. Notes about cache / auth / boundaries

- Route requires authenticated user.
- Client should call this route only on client memory cache miss.
- Server checks `TranslationCache` before source lookup.
- Cache hits return `provider: "cache"` and skip redundant source fetch.
- Word / short phrase selections use the word translate path.
- Sentence / paragraph selections use the sentence translate path.
- Clients do not choose the runtime path.
- Successful results are cached and history is persisted asynchronously.
- Logs and Sentry metadata must not include raw selected text or raw context.

### Vocabulary API

#### 1. Purpose

Save a successful inline translation as a vocabulary item for the authenticated
user. Re-saving the same selection updates the existing item instead of creating
a duplicate.

#### 2. Method + path

```http
POST /api/vocabulary
```

#### 3. Request input

Request body:

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

#### 4. Success response

```ts
{
  success: true;
  data: VocabularyItem;
}
```

`VocabularyItem`:

```ts
{
  id: string;
  selectedText: string;
  translation: string;
  type: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 5. Error response

```ts
{ error: string }
```

| Status | Meaning |
|--------|---------|
| `400` | Invalid JSON/body |
| `401` | Missing auth |
| `404` | Inaccessible source |
| `500` | Unexpected vocabulary save failure |

#### 6. Notes about cache / auth / boundaries

- Route requires authenticated user.
- Source passage must belong to the authenticated user.
- The route upserts by a stable hash of `userId`, `sourceId`, selected text,
  context sentence, and target language.
- The route does not translate text; it only saves an already resolved
  translation.
- Logs and Sentry metadata must not include raw selected text or raw context.

## Server Logic

`POST /api/translate` resolves in this order:

1. Authenticate user.
2. Build server translation cache key.
3. Check `TranslationCache`.
4. If cache hit, return `provider: "cache"` without redundant source fetch.
5. If cache miss, verify the source passage is owned by the user.
6. Classify the selected text by input shape:
   - **Word / short phrase:** `<=4` tokens, `<=40` chars, no newline, no sentence-ending punctuation → word translate path.
   - **Sentence / paragraph:** newline, sentence-ending punctuation, `>4` tokens, or `>40` chars → sentence translate path.
7. Resolve the translation.
8. Return the resolved translation as soon as available.
9. Persist server cache and history asynchronously with error logging.

If async cache persistence fails, the current request still succeeds. The only user-visible cost is that a later identical request may miss server cache and recompute the translation.

## Naming Convention

Use input-focused names for translation code and docs:

| Concept | Preferred name | Avoid |
| --- | --- | --- |
| Public translation route | `Inline Translation API` or `POST /api/translate` | `dictionary route`, `translate mode route` |
| Word or short phrase input path | `word translate path` | `dictionary route`, `dictionary API`, `word lookup path` |
| Sentence or paragraph input path | `sentence translate path` | `machine translation path`, `sentence route` |
| Route selection | backend auto-detection | client-selected `mode` |

The `provider` response field indicates the data source (`"cache"`, `"dictionary"`, `"fallback"`, `"google_translate"`). It does not imply a call to `GET /api/dictionary/*`.

## Boundary with Dictionary Feature

`/api/translate` may reuse lexicon table read code for word selections, but it
must not make an internal HTTP request to `/api/dictionary/*`. Dictionary search,
suggest, autocomplete, and entry detail are separate features. See
[dictionary-feature.md](./dictionary-feature.md).
