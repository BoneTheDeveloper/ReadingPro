# Translation API Feature

Translation APIs provide fast English-to-Vietnamese translation for selected
reader text and let the user save successful translations as vocabulary.

The API feature has two runtime paths:

1. **Word lookup translation** resolves a word or short phrase against the
   lexicon tables through a translate-owned adapter.
2. **Sentence / paragraph translation** uses Google Translate-compatible machine
   translation for fast result.

Dictionary search, suggestions, and entry detail behavior are separate. See
[dictionary-feature.md](./dictionary-feature.md).

## Scope

In scope:

- Accept word, short phrase, sentence, or paragraph text selected from a passage.
- Resolve word / short phrase selections through the word lookup path.
- Resolve sentence / paragraph selections through Google Translate-compatible
  machine translation.
- Save successful translations through `POST /api/vocabulary`.

Out of scope:

- Dictionary search and autocomplete UX.
- AI translation.
- Translation history viewer.
- Persisting client cache to `localStorage` or IndexedDB.
- Target-language selection beyond Vietnamese.
- Custom right-click menu.
- Pronunciation audio.

## Endpoints

### Translate API

#### 1. Purpose

Fast inline English-to-Vietnamese translation for selected study reader text.
This route owns both word lookup and machine translation paths. It does not
expose dictionary search, autocomplete, entry detail, or AI translation.

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
| `500` | Unexpected failure or Google Translate provider failure |

#### 6. Notes about cache / auth / boundaries

- Route requires authenticated user.
- Client should call this route only on client memory cache miss.
- Server checks `TranslationCache` before source lookup.
- Cache hits return `provider: "cache"` and skip redundant source fetch.
- Word / short phrase selections use the word lookup path.
- Sentence / paragraph selections use the Google Translate-compatible provider.
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

Translation must not call AI. `POST /api/translate` resolves in this order:

1. Authenticate user.
2. Build server translation cache key.
3. Check `TranslationCache`.
4. If cache hit, return `provider: "cache"` without redundant source fetch. Cache hit is keyed by `userId + sourceId`, so it proves ownership for this result.
5. If cache miss, verify the source passage is owned by the user.
6. Classify selection into one of two paths:
   - **Word / short phrase:** `<=4` tokens, `<=40` chars, no newline, no sentence-ending punctuation.
   - **Sentence / paragraph:** newline, sentence-ending punctuation, `>4` tokens, or `>40` chars.
7. Word / short phrase path uses word lookup for exact headword or exact alias primary translation.
8. Sentence / paragraph path uses the Google Translate-compatible provider.
9. Return the resolved translation as soon as available.
10. Persist server cache and history asynchronously with error logging.

If async cache persistence fails, the current request still succeeds. The only user-visible cost is that a later identical request may miss server cache and recompute the translation.

## Naming Convention

Use translation API feature names for translation code and docs:

| Concept | Preferred name | Avoid in translation API feature |
| --- | --- | --- |
| Word or short phrase branch | `word lookup path` | `dictionary route`, `dictionary API` |
| Translate-owned adapter for word lookup | `wordLookup` / `word-lookup` | `dictionaryLookupRoute` |
| Full public dictionary feature | `dictionary feature` or `/api/dictionary/*` | `translate word lookup` |
| Sentence or paragraph branch | `machine translation path` | `AI translation` |

The word lookup path may read from lexicon tables and may reuse lower-level
lexicon data-access code, but translation docs should not call it the
dictionary route. `/api/dictionary/*` means the public dictionary API feature:
suggest, search, exact lookup, and entry detail.

The API result provider may still be `"dictionary"` for backward-compatible
source labeling. That provider value does not mean `POST /api/translate` called
`GET /api/dictionary/lookup`.

## Internal Word Lookup Use

Quick translation may use the lexicon tables internally for word and short
phrase selections, but it must not become a dictionary search feature.

Allowed:

- Exact headword lookup.
- Exact alias lookup.
- Primary translation selection.
- Deterministic fallback for word lookup misses.
- Reuse of lower-level lexicon table read code through the translate-owned
  word lookup adapter.

Not allowed in this API feature:

- Calling `GET /api/dictionary/lookup` from inside `POST /api/translate`.
- Prefix suggest search.
- Search results lists.
- Multi-sense dictionary detail rendering.
- Autocomplete behavior.

Those belong to [dictionary-feature.md](./dictionary-feature.md).

The important boundary: `/api/translate` may reuse lexicon table read code,
but it should not make an internal HTTP request to `/api/dictionary/lookup`.
Internal HTTP would add avoidable latency, duplicate auth/error handling, and
blur the route boundary.

## Google Translate Provider

Fast sentence/paragraph translation uses a Google Translate-compatible endpoint.
If the provider fails, the route returns the standard `500` error without
falling back to AI.

## Observability

Routes use `createRequestLogger()` and `createRequestLogContext()`.

Spans should cover:

- Auth.
- Client cache miss API request.
- Server cache lookup.
- Source lookup on server cache miss.
- Word lookup for word / short phrase selections.
- Google Translate provider call for sentence / paragraph selections.
- Async cache/history writes.

Logs and Sentry metadata must avoid raw selected text and raw context. Record lengths, source id, target language, provider, cache hit state, and result status instead.

## V1 Boundaries

V1 intentionally excludes AI translation, dictionary autocomplete, dictionary detail rendering inside quick translate, a custom right-click menu, a translation history viewer, flashcard generation from vocabulary, pronunciation audio, and target-language selection beyond Vietnamese.
