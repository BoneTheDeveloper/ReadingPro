# EP-01 · Content Import

**PRD Solution area:** 1. Bring any passage · [Product PDR](../../Product/overview-pdr.md)

The learner turns content from any source into a study passage. Sources: pasted text, PDF,
YouTube link (via transcription), web link, and paper images (via OCR).

---

## US-01 · Paste English text

**Priority:** Must **Status:** Implemented

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

**Traceability:** Use case [UC-01](../use-cases.md#uc-01-upload-and-analyze-content) ·
Scope: Import · Tests: [test-scenarios.md](../../Testing/test-scenarios.md)

---

## US-02 · Upload a PDF

**Priority:** Must **Status:** Implemented

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

**Traceability:** Use case [UC-01](../use-cases.md#uc-01-upload-and-analyze-content) ·
Scope: Import · Tests: [test-scenarios.md](../../Testing/test-scenarios.md)

---

## US-03 · Import from a YouTube link

**Priority:** Should **Status:** Planned

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

**Traceability:** Use case _(to author)_ · Scope: Import · Tests: _pending_

---

## US-04 · Import from a web link

**Priority:** Should **Status:** Planned

**As a** learner, **I want** to import a web article link, **so that** I can study online
reading material as a passage.

**Acceptance criteria**

```gherkin
Scenario: Import a readable article
  Given I paste a web link to an article
  When I submit
  Then the system extracts the main text and creates a passage

Scenario: Page content cannot be extracted
  Given the page has no extractable article text
  When I submit
  Then the system explains the import failed and suggests pasting text instead
```

**Traceability:** Use case _(to author)_ · Scope: Import · Tests: _pending_

---

## US-05 · Import a paper passage via OCR

**Priority:** Could **Status:** Planned

**As a** learner, **I want** to capture a paper passage with my camera or an image, **so that**
printed material I read offline becomes a study passage.

**Acceptance criteria**

```gherkin
Scenario: OCR a clear image
  Given I upload a clear image of printed English text
  When I submit
  Then the system runs OCR and creates a passage from the recognized text

Scenario: Image is unreadable
  Given the image is too blurry or low-contrast to recognize
  When I submit
  Then the system reports the text could not be read and lets me retry
```

- The learner can correct recognized text before the passage is finalized.

**Traceability:** Use case _(to author)_ · Scope: Import · Tests: _pending_
