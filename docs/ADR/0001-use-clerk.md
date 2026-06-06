# ADR 0001: Use Clerk

## Status

Accepted.

## Context

The app needs email/password login, OAuth, protected routes, and a reliable session API for Next.js App Router.

## Decision

Use Clerk for authentication and identity. Store an app-owned `UserProfile` row keyed by Clerk user id for domain ownership.

## Consequences

- Clerk owns sessions, hosted auth components, and OAuth provider integration.
- App data ownership uses `UserProfile.id`.
- Server code calls `getAuthenticatedUser()` to sync and return the profile.
- Production must use separate Clerk production keys.

## Alternatives Considered

- Custom auth: more control, higher security and maintenance burden.
- NextAuth/Auth.js: viable, but Clerk provides faster hosted UI/OAuth setup for the MVP.

