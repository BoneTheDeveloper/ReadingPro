# Auth Data Flow

## Page Request

```text
Browser request
  -> src/proxy.ts
  -> Clerk middleware checks session (optimistic redirect only)
  -> protected route without session redirects to localized sign-in
  -> authenticated auth page redirects to dashboard
  -> next-intl handles locale routing
```

## API Route Auth (hot path)

```text
API route handler
  -> getUserId()
  -> Clerk auth()          ← JWT only, no Backend API call, no DB write
  -> userId string
  -> DB query with { where: { userId } }
```

## Page / Server Component Auth

```text
Server Component
  -> getPageUserId()
  -> auth.protect()        ← authoritative JWT check; redirects if no session
  -> userId string
```

## Profile Sync

```text
Clerk event (user.created / user.updated / user.deleted)
  -> POST /api/webhooks/clerk
  -> verifyWebhook()       ← signature check
  -> syncUser() / deleteUserProfile()
  -> UserProfile row upserted or hard-deleted
```

Lazy first-write fallback (before first webhook delivery):

```text
Shared create module (passage/translation/vocabulary/session)
  -> withUserProfile(userId, write)
     -> write()                         ← runs optimistically; no extra round-trip
        -> on missing UserProfile FK (P2003 *_userId_fkey):
           -> ensureUserProfile(userId) ← idempotent upsert
           -> write()                   ← retry once, now FK target exists
        -> other FK errors (e.g. *_sourceId_fkey) propagate unchanged
```

## Ownership Enforcement

Every user-owned operation must supply `userId` from the auth gate:

- `Passage.userId`
- `StudySession.userId`
- `StudyChatMessage.userId`
- `TranslationCache.userId`
- `TranslationHistory.userId`
- `VocabularyItem.userId`
- `FileUploadIntent.userId`

`userId` comes from `getUserId()` or `getPageUserId()`, never from the request body.

## Failure Behavior

- API routes return `401` when no authenticated user exists.
- Owned resources should return `404` rather than exposing cross-user existence.
- Protected pages redirect through Clerk/localized sign-in.
