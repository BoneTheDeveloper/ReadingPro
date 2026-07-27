# EP-01 · Content Import

**PRD Solution area:** 1. Bring any passage

The learner turns content from any source into a study passage. Sources: pasted text, PDF,
YouTube link (via transcription)

---

## US-01 · Paste English text

**As a** learner, **I want** to paste English text with an optional title, **so that** I can
turn my own material into a study passage.

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


**As a** learner, **I want** to upload a PDF, **so that** the app extracts its text into a
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


**As a** learner, **I want** to import a YouTube link, **so that** I can study its spoken
content as a passage without paying for heavy media processing.

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
