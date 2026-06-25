# Translate and Save a Word

## Quick Translate (Floating Popup)

1. User selects text inside the reading content.
2. A compact floating **translate icon** appears near the selection.
3. User clicks the icon → a popup shows the selected text and a loading state.
4. Translation resolves → the popup shows the result.
5. User clicks **Details** → the studio panel switches to the Translation detail view.
6. User clicks **Save** → the word is saved to vocabulary. The save control reflects "already saved" to prevent duplicates.

## Save from Dictionary

1. User searches for a word in the Dictionary.
2. User opens a dictionary entry.
3. User clicks **Save** → the word is saved to vocabulary.

## Routes

| Action | Route |
|--------|-------|
| Translate selection | `POST /api/translation/translate` |
| Save vocabulary | `POST /api/vocabulary` |
| Lookup word | `GET /api/dictionary/search` |
| Open dictionary | `/dictionary` |
