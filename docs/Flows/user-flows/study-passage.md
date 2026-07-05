# Study a Passage

## Open a Passage

1. User selects a passage from the left panel (sources list).
2. The content panel displays the passage text.

## Read Original or Simplified Version

1. Passage shows **Original** by default.
2. If a simplified version is available (auto-generated during upload), a toggle appears — user switches between **Original** and **Simplified**.
3. A CEFR badge and word count are shown in the meta bar.

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

## Routes & Actions

| Action | Implementation |
|--------|-----------------|
| Open study workspace | GET `/[locale]/study` (Server Component page) |
| List artifacts | Server Action: `getStudioArtifactsAction` from `src/features/studio-panel/actions.ts` |
| Fetch artifact questions | Server Action: `getArtifactQuestionsAction` from `src/features/studio-panel/actions.ts` |
| Generate quiz | `POST /api/studio/questions` (route handler with LLM streaming) |
| Record quiz result | Server Action: `recordQuizResultAction` from `src/features/studio-panel/actions.ts` |
| Reset quiz result | Server Action: `resetQuizResultAction` from `src/features/studio-panel/actions.ts` |
| Chat with tutor | `POST /api/studio/chat` (route handler with LLM streaming) |
| Get chat history | Server Action: `getChatHistoryAction` from `src/features/studio-panel/actions.ts` |
| Delete passage | Server Action: `deletePassageAction` from `src/features/study-workspace/actions.ts` |
