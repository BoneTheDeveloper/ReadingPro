import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { cache } from "react";
import { createModuleLogger } from "@/server/observability/logger";
import { syncUser } from "./sync-user";

const log = createModuleLogger("auth:utils");

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "AuthenticationRequiredError";
  }
}
export const getCurrentUser = cache(async () => {
  const { userId } = await auth();
  if (!userId) return null;

  Sentry.setUser({ id: userId });

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  const primaryEmail =
    clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

  return syncUser(
    clerkUser.id,
    primaryEmail,
    clerkUser.fullName ?? clerkUser.firstName ?? undefined,
    clerkUser.imageUrl,
  );
});

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthenticationRequiredError();
  }
  return user;
}

export async function getAuthenticatedUser() {
  const user = await requireAuth();
  log.info(
    { authenticated: true, userPresent: true },
    "Authenticated user retrieved",
  );
  return user;
}

/**
 * Fast-path auth gate for API routes that only need the user id.
 *
 * Reads the verified Clerk session JWT via `auth()` — no Backend API call and no DB
 * write — and returns the id. Clerk already dedupes `auth()` per request, so this stays
 * cheap without an extra `cache()` wrapper. Use this instead of `getCurrentUser()`
 * wherever only `userId` is required; reach for `getCurrentUser()` only when the full
 * profile (email/name/avatar) is needed.
 */
export async function getUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new AuthenticationRequiredError();
  }
  Sentry.setUser({ id: userId });
  return userId;
}

/**
 * Page / Server Component auth gate. JWT-only (no Backend API call, no DB write).
 *
 * Uses Clerk's `auth.protect()`, which redirects an unauthenticated visitor to the
 * sign-in page (the page-correct behavior) and returns the verified id otherwise. This is
 * the *authoritative* check for a page: middleware is only an optimistic redirect and must
 * not be the sole gate (a route matcher gap or a middleware bypass would otherwise expose
 * the page). Use this in Server Components; use `getUserId()` in API routes (throws → 401).
 */
export async function getPageUserId(): Promise<string> {
  const { userId } = await auth.protect();
  Sentry.setUser({ id: userId });
  return userId;
}
