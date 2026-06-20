# Flows

**Lens:** white box, implementation-centric — *how* a request travels through the code
(routes, functions, services, and the DB rows it writes) to fulfill a feature.

This is the counterpart to [use cases](../Requirements/use-cases.md), which describe the
same features as a **black box** (actor goals, preconditions, main/alternative flows). Use
cases say *what* the system does for the user; flows say *how* the code does it. Neither
restates the other — cross over via the map below. This is **not** a detailed vs. overview
split: each lens holds information the other never does.

## Flow ↔ Use case map

| Flow | Covers use case(s) |
|------|--------------------|
| [upload-flow.md](upload-flow.md) | UC-01 Upload and Analyze Content |
| [study-flow.md](study-flow.md) | UC-02 Read Passage, UC-03 Flashcard Test, UC-08 Manage Study Workspace |
| [study-chat-flow.md](study-chat-flow.md) | UC-12 Ask Study Chat |
| [translation-flow.md](translation-flow.md) | UC-09 Translate Selection |
| [dictionary-flow.md](dictionary-flow.md) | UC-11 Search Dictionary |
| [vocabulary-flow.md](vocabulary-flow.md) | UC-10 Save Vocabulary |
| [spaced-repetition-flow.md](spaced-repetition-flow.md) | UC-04 Review Vocabulary (Spaced Repetition) |
| [auth-flow.md](auth-flow.md) | UC-05 Sign In / Sign Up, UC-06 Sign Out |
| [navigation-flow.md](navigation-flow.md) | Cross-cutting page-to-page navigation (no single use case) |
