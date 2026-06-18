---
phase: 4
title: "Clerk webhook sync"
status: pending
priority: P1
effort: "4h"
dependencies: [3]
---

# Phase 4: Clerk webhook sync

## Overview

Keep `UserProfile` fresh (email/name/avatar) and handle account deletion via a
Clerk → svix webhook, since the read path no longer re-syncs on every request.
Subscribe `user.created`, `user.updated`, `user.deleted`.

## Requirements

- Functional:
  - `POST /api/webhooks/clerk` verifies the svix signature via Clerk `verifyWebhook()`.
  - `user.created` / `user.updated` → `syncUser(id, email, name, avatarUrl)` (existing fn).
  - `user.deleted` → hard delete `db.userProfile.delete({ where: { id } })`. FK relations
    use `onDelete: Cascade` (verified in schema), so all user-scoped rows cascade — correct
    for account deletion. No soft-delete column needed.
  - Invalid signature → 400; unhandled event type → 200 (ack, ignore).
  - Route is public (NOT behind the auth gate) — `proxy.ts` already lets `/api/*` through;
    confirm the webhook path is not redirected and add to public matcher if needed.
- Non-functional:
  - Idempotent: Clerk/svix retries on non-2xx; handlers must be safe to replay (upsert/delete
    are idempotent).
  - Return 2xx quickly (svix 15s timeout) to avoid retries.

## Architecture

```ts
// src/app/api/webhooks/clerk/route.ts
import { verifyWebhook } from "@clerk/nextjs/webhooks";

export async function POST(req: Request) {
  let evt;
  try {
    evt = await verifyWebhook(req);           // reads CLERK_WEBHOOK_SIGNING_SECRET from env
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (evt.type) {
    case "user.created":
    case "user.updated": {
      const u = evt.data;
      const email = u.email_addresses?.find(e => e.id === u.primary_email_address_id)
        ?.email_address ?? u.email_addresses?.[0]?.email_address;
      await syncUser(u.id, email, fullName(u), u.image_url);
      break;
    }
    case "user.deleted": {
      if (evt.data.id) await deleteUserProfile(evt.data.id);  // hard delete, FK cascade
      break;
    }
  }
  return new Response("ok", { status: 200 });
}
```

Note webhook payload is **snake_case** (`email_addresses`, `primary_email_address_id`,
`image_url`) — different from the camelCase Backend API object used in `getCurrentUser`.
Map carefully; cover with tests.

`verifyWebhook` reads the signing secret from env automatically — no manual svix wiring.

## Related Code Files

- Add: `src/app/api/webhooks/clerk/route.ts`
- Add: `src/app/api/webhooks/clerk/route.test.ts`
- Modify: `src/server/auth/sync-user.ts` — add `deleteUserProfile(id)` (hard delete)
- Modify: `src/proxy.ts` — ensure `/api/webhooks/clerk` is public (it already skips `/api/`;
  confirm no auth redirect applies)
- Env: add `CLERK_WEBHOOK_SIGNING_SECRET` to `.env` + Vercel project env (all environments).
  Document in `docs/Operations/` (do NOT commit the value).
- Clerk Dashboard (ops, manual): create webhook endpoint → app URL `/api/webhooks/clerk`,
  subscribe the 3 events, copy signing secret into env.

## Implementation Steps

0. **Preflight:** confirm `@clerk/nextjs/webhooks` resolves and exports `verifyWebhook`
   (verified present at `node_modules/@clerk/nextjs/dist/types/webhooks.d.ts`). If a future
   Clerk bump removes it, fall back to the `svix` `Webhook` class.
1. Add `deleteUserProfile(id)` to `sync-user.ts`.
2. Write webhook route with `verifyWebhook` + event switch + snake_case mapping.
3. **Tests** (`route.test.ts`): mock `verifyWebhook`:
   - invalid signature → 400
   - `user.created` → `syncUser` called with mapped fields
   - `user.updated` → `syncUser` called
   - `user.deleted` → `deleteUserProfile` called with id
   - unknown event → 200, no handler called
4. Confirm `/api/webhooks/clerk` reachable unauthenticated (middleware pass-through).
5. Add `CLERK_WEBHOOK_SIGNING_SECRET` to local `.env` + document Vercel setup.
6. Configure the Clerk Dashboard endpoint (ops step; record in docs).
7. `pnpm run typecheck` + tests.

## Success Criteria

- [ ] Preflight: `@clerk/nextjs/webhooks` `verifyWebhook` resolves (svix fallback noted)
- [ ] `POST /api/webhooks/clerk` verifies svix signature; bad sig → 400
- [ ] created/updated → `syncUser` (snake_case payload mapped correctly)
- [ ] deleted → hard delete; FK cascade removes user-scoped rows
- [ ] Unknown events ack 200; handlers idempotent on retry
- [ ] Webhook route is publicly reachable (not auth-redirected)
- [ ] `CLERK_WEBHOOK_SIGNING_SECRET` documented for local + Vercel (value not committed)
- [ ] Tests green; `pnpm run typecheck` clean

## Risk Assessment

- Risk: payload shape mismatch (snake_case) silently drops fields. Mitigation: explicit
  mapping tests with realistic Clerk payloads.
- Risk: secret missing in an env → `verifyWebhook` throws → 400 loops. Mitigation: ops
  checklist; verify in each Vercel environment before enabling.
- Risk: `user.deleted` cascade removes data irreversibly. Mitigation: confirmed intended
  for account deletion; cascade already in schema; covered by test asserting delete-by-id.
- Known limitation (zombie resurrection): `ensureUserProfile` (Phase 3) upserts
  unconditionally, so a late authenticated write that lands after `user.deleted` can recreate
  the profile row. Accepted: Clerk revokes the session on delete, so the window is brief and
  requires an in-flight request with a not-yet-revoked token. Documented, not guarded — a
  tombstone check was considered and rejected as over-engineering for this app.
- Note (out-of-order delivery): Clerk/svix do not guarantee `user.updated` ordering; a stale
  retry could overwrite newer name/email. Accepted as low-impact for this data; no
  `updated_at` comparison added (YAGNI).
