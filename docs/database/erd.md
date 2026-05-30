# Entity Relationship Diagram (ERD)

**English Reading Training App**

---

## Mermaid ERD

```mermaid
erDiagram
    UserProfile {
        string id PK "cuid()"
        string email UK "nullable"
        string name "nullable"
        string avatarUrl "nullable"
        string bio "nullable"
        enum targetLevel "CEFRLevel, default B2"
        enum tier "Tier, default FREE"
        string stripeCustomerId UK "nullable"
        datetime createdAt "now()"
        datetime updatedAt "auto"
    }

    Passage {
        string id PK "cuid()"
        string userId FK "→ UserProfile.id"
        string title
        string content
        string simplifiedContent "nullable"
        enum originalLevel "CEFRLevel, nullable"
        enum simplifiedLevel "CEFRLevel, nullable"
        int wordCount
        enum sourceType "SourceType"
        string fileUrl "nullable"
        datetime createdAt "now()"
        datetime updatedAt "auto"
    }

    Question {
        string id PK "cuid()"
        string passageId FK "→ Passage.id"
        string questionText
        json options "[{id, text}]"
        string correctOption "option ID"
        string sourceText
        int sourceLine
        string explanation
        enum questionType "default MULTIPLE_CHOICE"
        int difficulty "default 3"
        datetime createdAt "now()"
    }

    CardReview {
        string id PK "cuid()"
        string questionId FK "→ Question.id"
        string userId FK "→ UserProfile.id"
        int qualityRating "SM-2: 0-5"
        float easeFactor "default 2.5"
        int intervalDays "default 1"
        int repetitions "default 0"
        datetime nextReviewDate "default now()"
        datetime reviewedAt "default now()"
    }

    StudySession {
        string id PK "cuid()"
        string userId FK "→ UserProfile.id"
        string passageId FK "→ Passage.id, nullable"
        datetime startedAt "default now()"
        datetime completedAt "nullable"
        int cardsReviewed "default 0"
        int newCards "default 0"
        int correctCount "default 0"
        int incorrectCount "default 0"
        float accuracyRate "nullable"
    }

    DictionaryEntry {
        string id PK "cuid()"
        string normalizedKey UK
        string normalizedTerm
        string sourceLanguage
        string targetLanguage
        string translation
        string type "nullable"
        string pronunciation "nullable"
        json meanings "nullable"
        json examples "nullable"
        json relatedWords "nullable"
        string source "default local"
        float confidence "default 0.8"
        datetime createdAt "now()"
        datetime updatedAt "auto"
    }

    TranslationCache {
        string id PK "cuid()"
        string cacheKey UK
        string userId FK "→ UserProfile.id"
        string sourceId FK "→ Passage.id"
        string selectedText
        string contextSentence
        string sourceLanguage
        string targetLanguage
        string mode
        string provider
        json response
        datetime createdAt "now()"
        datetime updatedAt "auto"
    }

    TranslationHistory {
        string id PK "cuid()"
        string userId FK "→ UserProfile.id"
        string sourceId FK "→ Passage.id"
        string selectedText
        string contextSentence
        string sourceLanguage
        string targetLanguage
        string mode
        string provider
        string translation
        json response
        datetime createdAt "now()"
    }

    VocabularyItem {
        string id PK "cuid()"
        string normalizedKey UK
        string userId FK "→ UserProfile.id"
        string sourceId FK "→ Passage.id"
        string selectedText
        string translation
        string contextSentence
        string sourceLanguage
        string targetLanguage
        string type "nullable"
        datetime createdAt "now()"
        datetime updatedAt "auto"
    }

    UserProfile ||--o{ Passage : "uploads"
    UserProfile ||--o{ StudySession : "creates"
    UserProfile ||--o{ CardReview : "reviews"
    UserProfile ||--o{ TranslationCache : "caches"
    UserProfile ||--o{ TranslationHistory : "records"
    UserProfile ||--o{ VocabularyItem : "saves"
    Passage ||--o{ Question : "contains"
    Question ||--o{ CardReview : "tracked by"
    Passage ||--o{ StudySession : "studied in"
    Passage ||--o{ TranslationCache : "translated in"
    Passage ||--o{ TranslationHistory : "translated in"
    Passage ||--o{ VocabularyItem : "saved from"
```

---

## Relationship Summary

| Relationship | Cardinality | Cascade |
|-------------|-------------|---------|
| UserProfile → Passage | One-to-Many | Yes |
| UserProfile → StudySession | One-to-Many | Yes |
| UserProfile → CardReview | One-to-Many | Yes |
| Passage → Question | One-to-Many | Yes |
| Question → CardReview | One-to-Many | Yes |
| Passage → StudySession | One-to-Many (nullable) | No |
| UserProfile → TranslationCache | One-to-Many | Yes |
| UserProfile → TranslationHistory | One-to-Many | Yes |
| UserProfile → VocabularyItem | One-to-Many | Yes |
| Passage → TranslationCache | One-to-Many | Yes |
| Passage → TranslationHistory | One-to-Many | Yes |
| Passage → VocabularyItem | One-to-Many | Yes |

---

## Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| Passage | `[userId, createdAt]` | Query user's passages sorted by date |
| CardReview | `[userId, nextReviewDate]` | Fetch due cards for review |
| StudySession | `[userId, startedAt]` | Query user's sessions sorted by date |
| CardReview | `[questionId, userId]` UNIQUE | Prevent duplicate reviews per card |
| DictionaryEntry | `[sourceLanguage, targetLanguage, normalizedTerm]` | Dictionary lookup and suggest search |
| TranslationCache | `cacheKey` UNIQUE | Reuse exact translation requests |
| TranslationCache | `[userId, sourceId, targetLanguage]` | User/source-scoped cache queries |
| TranslationHistory | `[userId, sourceId, createdAt]` | Translation analytics |
| VocabularyItem | `normalizedKey` UNIQUE | Upsert duplicate saved vocabulary |
| VocabularyItem | `[userId, sourceId, createdAt]` | Saved vocabulary listing |

---

## Enum Definitions

```mermaid
classDiagram
    class CEFRLevel {
        <<enumeration>>
        A1
        A2
        B1
        B2
        C1
        C2
    }

    class SourceType {
        <<enumeration>>
        TEXT
        PDF
    }

    class QuestionType {
        <<enumeration>>
        MULTIPLE_CHOICE
        TRUE_FALSE
    }

    class Tier {
        <<enumeration>>
        FREE
        PRO
    }
```

---

**Last Updated:** 2026-05-29
