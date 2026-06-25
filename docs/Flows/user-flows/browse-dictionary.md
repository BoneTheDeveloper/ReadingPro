# Browse Dictionary

## Search for a Word

1. User opens the Dictionary page (`/dictionary`).
2. User types a query in the search field.
3. Suggestions appear as the user types.
4. User picks a suggestion or submits the search → the entry detail renders.

## View Entry Details

1. The entry shows the word, its senses, and translations.
2. User can click **Save** to save the word to vocabulary.

## Routes

| Action | Route |
|--------|-------|
| Open dictionary | `/dictionary` |
| Search | `GET /api/dictionary/search` |
| View entry | `GET /api/dictionary/entries/{id}` |
| Save to vocabulary | `POST /api/vocabulary` |
