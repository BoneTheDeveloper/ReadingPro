# Use Cases

## UC-01 Upload Text

Learner pastes English text, gives it an optional title, and creates a passage with CEFR metadata and generated questions.

Primary route: `POST /api/upload/text`

## UC-02 Upload PDF

Learner uploads a PDF. The app stores the file, extracts text, analyzes content, and creates a passage.

Primary route: `POST /api/upload`

## UC-03 Study Passage

Learner studies original or simplified content in the workspace, opens generated questions, translates selections, and chats about the passage.

Primary page: `/[locale]/study`

## UC-04 Translate Selection

Learner selects English text from an owned passage. The app validates limits, checks passage ownership, returns a translation, and records cache/history.

Primary route: `POST /api/translate`

## UC-05 Save Vocabulary

Learner saves a selected term and translation for later use. The app upserts by a stable user/source/selection/context key.

Primary route: `POST /api/vocabulary`

## UC-06 Search Dictionary

Learner searches seeded English-Vietnamese dictionary entries by headword, alias, or normalized query.

Primary routes: `/api/dictionary/lookup`, `/api/dictionary/search`, `/api/dictionary/suggest`, `/api/dictionary/entries/[entryId]`

## UC-07 Ask Study Chat

Learner asks a tutor question about the selected passage. The app loads recent persisted messages and the passage context, streams a response, and persists the assistant answer.

Primary route: `POST /api/study-chat`

## UC-08 Review Cards

Learner reviews due cards. The app updates card review state with SM-2 interval calculations and exposes progress stats.

Primary routes: `/api/cards/due`, `/api/cards/review`, `/api/progress/stats`
