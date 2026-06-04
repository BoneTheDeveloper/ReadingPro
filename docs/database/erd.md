# Entity Relationship Diagram (ERD)

**English Reading Training App**

All persisted identifiers in the PostgreSQL `public` schema use native `uuid`.
Supabase Auth supplies `UserProfile.id`; application-owned records use
`gen_random_uuid()`.

```mermaid
erDiagram
    UserProfile {
        uuid id PK "Supabase Auth"
        string email UK "nullable"
        string name "nullable"
        enum targetLevel "default B2"
        enum tier "default FREE"
    }

    Passage {
        uuid id PK "gen_random_uuid()"
        uuid userId FK
        string title
        string content
        enum sourceType
        datetime deletedAt "nullable"
    }

    StudyChatMessage {
        uuid id PK "gen_random_uuid()"
        uuid userId FK
        uuid passageId FK
        string role
        string content
    }

    Question {
        uuid id PK "gen_random_uuid()"
        uuid passageId FK
        string questionText
        json options
        string correctOption "UI option ID"
    }

    CardReview {
        uuid id PK "gen_random_uuid()"
        uuid questionId FK
        uuid userId FK
        int qualityRating
    }

    StudySession {
        uuid id PK "gen_random_uuid()"
        uuid userId FK
        uuid passageId "nullable entity reference"
        datetime startedAt
    }

    TranslationCache {
        uuid id PK "gen_random_uuid()"
        string cacheKey UK
        uuid userId FK
        uuid sourceId FK
        json response
    }

    TranslationHistory {
        uuid id PK "gen_random_uuid()"
        uuid userId FK
        uuid sourceId FK
        string translation
        json response
    }

    VocabularyItem {
        uuid id PK "gen_random_uuid()"
        string normalizedKey UK
        uuid userId FK
        uuid sourceId FK
        string translation
    }

    DictionaryEntry {
        uuid id PK "gen_random_uuid()"
        string headword
        string normalizedHeadword
        string sourceLanguage
    }

    DictionarySense {
        uuid id PK "gen_random_uuid()"
        uuid entryId FK
        string partOfSpeech "nullable"
        string definition "nullable"
    }

    DictionaryTranslation {
        uuid id PK "gen_random_uuid()"
        uuid senseId FK
        string targetLanguage
        string translation
    }

    DictionaryAlias {
        uuid id PK "gen_random_uuid()"
        uuid entryId FK
        string normalizedAlias
    }

    DictionarySourceAudit {
        uuid id PK "gen_random_uuid()"
        string entityType
        uuid entityId "persisted entity reference"
        string batchName
    }

    UserProfile ||--o{ Passage : owns
    UserProfile ||--o{ StudyChatMessage : sends
    UserProfile ||--o{ StudySession : creates
    UserProfile ||--o{ CardReview : reviews
    UserProfile ||--o{ TranslationCache : caches
    UserProfile ||--o{ TranslationHistory : records
    UserProfile ||--o{ VocabularyItem : saves
    Passage ||--o{ StudyChatMessage : contains
    Passage ||--o{ Question : contains
    Passage ||--o{ TranslationCache : scopes
    Passage ||--o{ TranslationHistory : scopes
    Passage ||--o{ VocabularyItem : sources
    Question ||--o{ CardReview : tracked-by
    DictionaryEntry ||--o{ DictionarySense : defines
    DictionaryEntry ||--o{ DictionaryAlias : aliases
    DictionarySense ||--o{ DictionaryTranslation : translates
```

## Identifier Notes

- `StudySession.passageId` is a nullable UUID entity reference without a
  database foreign-key relation.
- `DictionarySourceAudit.entityId` is a UUID entity reference. `entityType`
  identifies the referenced public entity type.
- `Question.options` and `Question.correctOption` contain UI/result option IDs,
  not persisted public-table identifiers.
- Ordinary string keys such as `cacheKey`, `normalizedKey`, and
  `stripeCustomerId` remain text.

## Cascade Rules

| Parent | Children with `ON DELETE CASCADE` |
|--------|------------------------------------|
| UserProfile | Passage, StudyChatMessage, CardReview, StudySession, TranslationCache, TranslationHistory, VocabularyItem |
| Passage | StudyChatMessage, Question, TranslationCache, TranslationHistory, VocabularyItem |
| Question | CardReview |
| DictionaryEntry | DictionarySense, DictionaryAlias |
| DictionarySense | DictionaryTranslation |

**Last Updated:** 2026-06-04
