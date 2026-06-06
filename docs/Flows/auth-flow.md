# Auth Flow

## Page Request

```text
Browser request
  -> src/proxy.ts
  -> Clerk middleware checks session
  -> protected route without session redirects to localized sign-in
  -> authenticated auth page redirects to dashboard
  -> next-intl handles locale routing
```

## Server User Access

```text
Route handler/server action/page
  -> getAuthenticatedUser()
  -> Clerk auth()
  -> fetch Clerk user
  -> syncUser()
  -> UserProfile row
```

## Ownership Enforcement

Every user-owned operation must use the synced `UserProfile.id`:

- `Passage.userId`
- `StudySession.userId`
- `CardReview.userId`
- `StudyChatMessage.userId`
- `TranslationCache.userId`
- `TranslationHistory.userId`
- `VocabularyItem.userId`
- `FileUploadIntent.userId`

## Failure Behavior

- API routes return `401` when no authenticated user exists.
- Owned resources should return `404` rather than exposing cross-user existence.
- Protected pages redirect through Clerk/localized sign-in.

