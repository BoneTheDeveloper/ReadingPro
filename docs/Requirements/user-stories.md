# User Stories

**English Reading Training App**

Each story is grounded in a use case from [use-cases.md](use-cases.md). Format:
As a `<role>`, I want `<capability>`, so that `<benefit>`. Stories are keyed `US-xx`
and link to the use case they realize.

| Story | As a... | I want... | So that... | Use case |
|-------|---------|-----------|-----------|----------|
| US-01 | learner | to paste English text with an optional title | I can turn my own material into a graded passage | [UC-01](use-cases.md#uc-01-upload-and-analyze-content) |
| US-02 | learner | to upload a PDF | the app extracts and analyzes its text into a passage | [UC-01](use-cases.md#uc-01-upload-and-analyze-content) |
| US-03 | learner | to toggle a simplified view of a passage | I can read at one CEFR level below the original | [UC-02](use-cases.md#uc-02-read-passage-with-simplified-view) |
| US-04 | learner | to answer comprehension questions with feedback and source citations | I can check my understanding of a passage | [UC-03](use-cases.md#uc-03-take-flashcard-test) |
| US-05 | learner | to review due cards rated by recall quality | spaced repetition schedules my next review | [UC-04](use-cases.md#uc-04-review-due-cards-spaced-repetition) |
| US-06 | visitor | to sign in or sign up via email or Google | I can access my own passages and progress | [UC-05](use-cases.md#uc-05-sign-in--sign-up) |
| US-07 | learner | to sign out | I can end my session securely | [UC-06](use-cases.md#uc-06-sign-out) |
| US-08 | learner | to see my progress stats | I know how many cards are mature, due, and reviewed today | [UC-07](use-cases.md#uc-07-view-progress-dashboard) |
| US-09 | learner | a resizable three-panel study workspace | I can read, quiz, and translate in one place | [UC-08](use-cases.md#uc-08-manage-study-workspace) |
| US-10 | learner | to translate a selected phrase from a passage I own | I understand difficult text in my language | [UC-09](use-cases.md#uc-09-translate-selection) |
| US-11 | learner | to save a term and its translation | I can build a personal vocabulary list | [UC-10](use-cases.md#uc-10-save-vocabulary) |
| US-12 | learner | to organize saved vocabulary into sets | I can group terms for focused review | [UC-10](use-cases.md#uc-10-save-vocabulary) |
| US-13 | learner | to search the English-Vietnamese dictionary | I can look up headwords, aliases, or suggestions | [UC-11](use-cases.md#uc-11-search-dictionary) |
| US-14 | learner | to ask a tutor question about the selected passage | I get contextual explanations while reading | [UC-12](use-cases.md#uc-12-ask-study-chat) |

## Coverage Note

Every use case (UC-01..UC-12) maps to at least one user story. UC-01 and UC-10 each
fan out to two stories (text/PDF upload; save/organize vocabulary). Test coverage per
story is tracked in [../Testing/test-scenarios.md](../Testing/test-scenarios.md) and
[../Testing/traceability-matrix.md](../Testing/traceability-matrix.md).
