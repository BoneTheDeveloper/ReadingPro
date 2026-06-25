# Study a Passage

## Open a Passage

1. User selects a passage from the left panel (sources list).
2. The content panel displays the passage text.

## Read Original or Simplified Version

1. Passage shows **Original** by default.
2. If a simplified version is available, a toggle appears — user switches between **Original** and **Simplified**.
3. A CEFR badge and word count are shown in the meta bar.

## Simplify a Passage

1. User opens a passage with no simplified version yet → a faded **Simplify** action appears.
2. User clicks **Simplify**:
   - For levels A1/A2: a dialog says no further simplification is possible. User closes it.
   - For levels B1+: a confirm dialog appears. User confirms → simplified version is generated.
3. Simplified content appears → the Original/Simplified toggle becomes available.

## Generate a Quiz

1. User clicks **Quiz** in the studio panel.
2. Questions are generated. A loading indicator shows in the results list.
3. When ready, the quiz appears in the results list.
4. User opens the quiz → answers each question.
5. On completion, a results view shows the score.

## Chat with AI Tutor

1. User opens the **Chat** view in the studio panel.
2. User types a question about the passage.
3. The AI tutor responds with context from the passage.

## Generate a Summary

1. User clicks **Summary** in the studio panel.
2. A summary is generated and appears in the results list.
3. User opens the summary to read it.

## Delete a Passage

1. User clicks **Delete** on a passage in the sources list.
2. The passage is removed from the list.

## Routes

| Action | Route |
|--------|-------|
| Open study workspace | `/study` |
| Simplify passage | `POST /api/study/passage/{id}/simplify` |
| Generate quiz | `POST /api/study/studio/questions` |
| Chat with tutor | `POST /api/study/studio/chat` |
| Delete passage | `DELETE /api/study/passage/{id}` |
