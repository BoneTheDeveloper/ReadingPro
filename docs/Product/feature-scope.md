# Feature Scope

## MVP In Scope

| Area | Scope |
|------|-------|
| Auth | Clerk sign-in/sign-up, Google OAuth, protected dashboard routes, user profile sync. |
| Import | Passage sources: pasted text, PDF, paper images via OCR, YouTube links via transcription, and web links. Validation and private file storage. |
| Study | Passage list, reading workspace, original/simplified content, generated questions. |
| AI | CEFR support, simplification, question generation, passage-grounded study chat. |
| Translation | English-to-Vietnamese selection translation, cache/history, vocabulary save from translate. |
| Dictionary | Seeded English-Vietnamese lookup/search/suggest/entry detail, vocabulary save from dictionary. |
| Vocabulary | Saved words/phrases with status tracking (NEW/LEARNING/MASTERED), auto daily/weekly sets, manual sets, occurrence history across passages. |
| Review | Card reviews, SM-2 interval updates, progress stats, vocabulary review scheduling. |
| Observability | Pino logs, Sentry errors/spans, performance benchmark hooks. |
| Deployment | Vercel, Neon Postgres, Vercel Blob, env separation. |

## Not In Current Scope

- Native mobile apps.
- Billing and subscriptions.
- Classroom/team management.
- Audio pronunciation.
- Offline-first sync.
- Multi-target-language dictionary support beyond current route contracts.

## Technical Constraints

- Source language is currently `en` for dictionary/translation route schemas.
- Target language is currently `vi` for dictionary/translation route schemas.
- Uploads are private and tied to authenticated users.
- Runtime data access must go through `DATABASE_URL`.
- Production storage must use private Vercel Blob tokens separated by environment.
