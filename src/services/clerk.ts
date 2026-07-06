import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { cache } from "react";
import { syncUser } from "@/server/auth/sync-user";
import { createModuleLogger } from "@/server/observability/logger";

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

export async function getUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new AuthenticationRequiredError();
  }
  Sentry.setUser({ id: userId });
  return userId;
}

export async function getPageUserId(): Promise<string> {
  const { userId } = await auth.protect();
  Sentry.setUser({ id: userId });
  return userId;
}
