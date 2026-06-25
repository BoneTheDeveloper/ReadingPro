# Review Vocabulary

## Start a Review Session

1. User opens Vocabulary (`/vocabulary`) and switches to the **Review** tab.
2. If words are due for review, a **Start Review** button is shown.
3. User clicks **Start Review** → the review session begins.

## Review Cards

1. Each card shows a word. User attempts to recall the meaning.
2. User clicks **Show Answer**.
3. User grades the response:
   - **Correct** — the word is marked as known.
   - **Incorrect** — the word is marked for re-review.

## Complete Review

1. After all due cards are reviewed, a summary screen shows the session result.
2. User is returned to the Vocabulary page.

## Status Progression

| Status | Description |
|--------|-------------|
| NEW | Just saved — scheduled for first review after 1 day |
| LEARNING | Reviewed at least once — scheduled daily until mastered |
| MASTERED | Answered correctly while in LEARNING — no further auto-reviews |

An item that was MASTERED but answered incorrectly returns to LEARNING.

## Manual Override

1. User can manually set a word's status (NEW / LEARNING / MASTERED) from the word detail view.

## Routes

| Action | Route |
|--------|-------|
| Open vocabulary | `/vocabulary` |
| Submit review result | `POST /api/vocabulary/{id}/review` |
| Override status | `PATCH /api/vocabulary/{id}/status` |
