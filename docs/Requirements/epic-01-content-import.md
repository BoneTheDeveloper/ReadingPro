# EP-01 · Content Import

**PRD Solution area:** 1. Bring any passage

Turns content from any source into a study passage. Sources: pasted text, PDF,
YouTube link (via transcription)

---

## US-01 · Paste English text

User paste English text with an optional title

**Acceptance criteria**

```gherkin
Scenario: Paste valid text
  Given I am signed in on the study or upload page
  When I paste English text within the length limits and submit
  Then the system creates a passage and opens it in the reading view

Scenario: Text fails validation
  Given I paste text that is too short or too long
  When I submit
  Then the system rejects it with an error and lets me retry
```

---

## US-02 · Upload a PDF


User upload a PDF, the app extracts its text into a
study passage.

**Acceptance criteria**

```gherkin
Scenario: Upload a valid PDF
  Given I am signed in
  When I upload a PDF within the size limit
  Then the system stores the file, extracts its text, and creates a passage

Scenario: Unsupported or oversized file
  Given I choose a file that is not a valid PDF or exceeds the size limit
  When I upload it
  Then the system rejects it with an error and lets me retry
```

- Uploaded files are private and tied to my account.


---

## US-03 · Import from a YouTube link


Usser to import a YouTube link, 

**Acceptance criteria**

```gherkin
Scenario: Import a transcribable video
  Given I paste a valid YouTube link
  When I submit
  Then the system retrieves the transcript and creates a passage from it

Scenario: Video has no usable transcript
  Given the linked video has no available transcript
  When I submit
  Then the system explains the import failed and suggests another source
```

- Transcription is the import path (chosen for cost efficiency over re-processing audio).
- Every import passes through a refinement stage before it is stored, so a passage
  reads like an article rather than raw extraction output. Auto-captions get
  punctuation, capitalization, and paragraphs, and lose sound cues, fillers, and
  channel meta-speech; PDF and pasted text get their layout repaired (hyphenation
  rejoined, page numbers and running headers dropped) without any wording changed.
  Refinement is best-effort: if it fails, the import still succeeds with the
  mechanically cleaned text, and a rewrite that drifts too far from its source is
  discarded rather than stored.
