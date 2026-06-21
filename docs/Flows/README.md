# Flows

Flows come in two lenses, split into two folders. Pick by the question you're asking:

| Folder | Lens | Question it answers |
|--------|------|---------------------|
| [`data-flows/`](data-flows/) | White box, implementation-centric | *How* a request travels through the code (routes → services → DB rows). |
| [`ui-flows/`](ui-flows/) | UX, user-centric | *How* the user moves and interacts (page-to-page + in-screen). |

Neither restates the other, and neither restates the [use cases](../Requirements/use-cases.md)
(black-box actor behavior — *what* the system does for the user). Cross over via the maps below.

## Data flows (white box)

*How the code fulfills each feature.* Counterpart to the black-box
[use cases](../Requirements/use-cases.md): use cases say *what*, data flows say *how the code
does it*.

| Data flow | Covers use case(s) |
|-----------|--------------------|
| [upload-flow.md](data-flows/upload-flow.md) | UC-01 Upload and Analyze Content |
| [study-flow.md](data-flows/study-flow.md) | UC-02 Read Passage, UC-03 Flashcard Test, UC-08 Manage Study Workspace |
| [study-chat-flow.md](data-flows/study-chat-flow.md) | UC-12 Ask Study Chat |
| [translation-flow.md](data-flows/translation-flow.md) | UC-09 Translate Selection |
| [dictionary-flow.md](data-flows/dictionary-flow.md) | UC-11 Search Dictionary |
| [vocabulary-flow.md](data-flows/vocabulary-flow.md) | UC-10 Save Vocabulary |
| [spaced-repetition-flow.md](data-flows/spaced-repetition-flow.md) | UC-04 Review Vocabulary (Spaced Repetition) |
| [auth-flow.md](data-flows/auth-flow.md) | UC-05 Sign In / Sign Up, UC-06 Sign Out |

## UI flows (UX)

*How the user moves and interacts.* The user flow itself lives in the black-box
[use cases](../Requirements/use-cases.md); these two docs add the layers use cases omit:

| UI flow | Lens |
|---------|------|
| [navigation-flow.md](ui-flows/navigation-flow.md) | Page-to-page navigation (which screen leads where). |
| [overall-ui-flows.md](ui-flows/overall-ui-flows.md) | In-screen interaction — element-level steps (click/select/popup) within a screen. |
