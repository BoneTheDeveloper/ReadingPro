# Upload Content

## Add a Source

1. User clicks **New Reading** or **Add source** in the Study workspace.
2. The upload modal opens with two options:
   - **File** — drop or select a file (e.g., PDF).
   - **Text** — paste raw text directly.
3. User provides content and submits.
4. The modal closes. A progress indicator appears in the sources panel while analysis runs.
5. When analysis finishes, the passage appears in the sources list and becomes selectable.

## Routes

| Action | Route |
|--------|-------|
| Open upload form | `/study` → New Reading |
| Submit file | `/api/upload` |
| Submit text | `/api/upload/text` |
| Analysis in progress | `/processing` |
