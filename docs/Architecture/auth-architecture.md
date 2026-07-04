# Auth Architecture

## Identity Provider

Clerk owns authentication, sessions, sign-in/sign-up UI, and OAuth providers. The app stores a synchronized profile row in `UserProfile`.

## Auth Gates

Two gate functions serve different surfaces:

| Function | Surface | Mechanism | On failure |
|----------|---------|-----------|------------|
| `getUserId()` | API route handlers | JWT-only via `auth()` — no Backend API call, no DB write | throws `AuthenticationRequiredError` → 401 |
| `getPageUserId()` | Server Components / pages | `auth.protect()` — authoritative JWT check | redirects to sign-in |
| `getCurrentUser()` | Anywhere the full profile is needed | JWT + Clerk Backend API + DB sync | returns `null` |

`getUserId()` is the standard gate for the 28 API routes. `getCurrentUser()` is reserved for surfaces that need email/name/avatar (currently none in route handlers).

## Profile Sync

`UserProfile` is kept fresh via two complementary mechanisms:

**Webhook sync (primary):** `POST /api/webhooks/clerk` receives `user.created`, `user.updated`, and `user.deleted` events from Clerk. Signature verified with `verifyWebhook()`. `user.deleted` triggers a hard delete (FK `onDelete: Cascade` cascades to owned rows).

**Lazy ensure-on-write fallback (secondary):** FK-creating writes in the shared create modules run through `withUserProfile(userId, write)`. It executes the write optimistically and adds no extra round-trip when the profile already exists (the common case). Only if the write fails on a missing `UserProfile` FK (`P2003` on a `<table>_userId_fkey` constraint) does it call `ensureUserProfile(userId)` and retry once. This covers the window between account creation and the first webhook delivery without taxing the hot path. Non-`userId` FK failures (e.g. a missing `sourceId`) propagate unchanged. A persistent heal path emits `log.warn`, signalling a broken/lagging webhook.

`UserProfile.id` is the Clerk user id. This avoids a separate auth-user mapping table.

## Route Protection

`src/proxy.ts` protects dashboard routes, handles auth-page redirects, and delegates locale routing to next-intl. Public/internal routes such as API routes, Next internals, Clerk internals, monitoring, and favicon are excluded as appropriate.

Middleware is an optimistic redirect only — `getPageUserId()` (via `auth.protect()`) is the authoritative gate for pages, guarding against route matcher gaps (cf. CVE-2025-29927).

## Ownership

User-owned tables store `userId` and must be filtered by it (`UserProfile.id` equals the
Clerk user id):

- `Passage`
- `StudySession`
- `StudyChatMessage`
- `TranslationCache`
- `TranslationHistory`
- `VocabularyItem`
- `FileUploadIntent`
- `StudioArtifact`

Dictionary tables are shared read data and are not user-owned.

Authenticated routes must enforce ownership with `userId`:

- Passage reads use `id`, `userId`, and `deletedAt: null`.
- Translation/vocabulary writes verify the `sourceId` belongs to the user.
- Study chat history is keyed by `userId` and `passageId`.
- Card review updates use `id` and `userId`.
- Study sessions use `userId`.

`userId` always comes from `getUserId()` / `getPageUserId()` (auth), never from the request body.

## Auth Failure Handling

| Case | Response |
|------|----------|
| No session on API route | `401` JSON error |
| Authenticated user requests another user's resource | `404` JSON error where possible |
| User visits protected page unauthenticated | Clerk/locale redirect to sign-in |
