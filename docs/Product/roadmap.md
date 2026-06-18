# Project Roadmap

## Current Status

As of 2026-06-06, the product is in MVP hardening. Core study, auth, database, storage, translation, dictionary, chat, and review workflows exist. Remaining work is mostly production verification, polish, analytics depth, and future content expansion.

## Phase Summary

| Phase | Scope | Status |
|-------|-------|--------|
| Core MVP | Upload, CEFR, simplification, questions, flashcards, progress | Complete |
| Observability | Sentry, Pino, spans, source maps | Complete |
| Study workspace | Three-panel workspace, study actions, panel state | Mostly complete |
| Auth | Clerk sign-in/sign-up/OAuth, route protection, profile sync | Complete |
| Production infra | Neon, Prisma, Vercel Blob, deploy contracts | In progress |
| Translation/dictionary | Selection translate, seeded dictionary, cache/history, vocabulary | In progress |
| Study chat | Passage-grounded streaming tutor and message persistence | In progress |
| Content expansion | OCR, YouTube/transcript sources | Planned |

## Near-Term Priorities

1. Finalize production environment verification for Clerk, Neon, Blob, Sentry, and Vercel.
2. Expand contract tests for route validation and ownership behavior.
3. Stabilize dictionary seed/import quality and benchmark budgets.
4. Polish paragraph translation and saved vocabulary review.
5. Harden study chat UI states, history loading, and failure recovery.
6. Add deeper progress analytics per passage/question.

## Deferred

- OCR for scanned PDFs.
- YouTube transcription.
- Payments/subscriptions.
- Classroom collaboration.
- Native mobile.
- Offline sync.

## Open Questions

- Final production PDF size limit.
- Whether dictionary routes should remain authenticated for all shared-data reads.
- How saved vocabulary should enter spaced repetition.
- Whether study chat should support provider selection or a single fixed model.

## References

- Feature scope: [feature-scope.md](feature-scope.md)
- Testing strategy: [../Testing/testing-strategy.md](../Testing/testing-strategy.md)

**Status:** Active
**Last Updated:** 2026-06-06
