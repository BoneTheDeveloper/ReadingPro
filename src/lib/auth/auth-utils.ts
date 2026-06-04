import { auth, clerkClient } from "@clerk/nextjs/server";
import { cache } from "react";
import { createModuleLogger } from "@/lib/core/logger";
import { db } from "@/lib/db/client";
import { syncUser } from "./sync-user";

const log = createModuleLogger("auth:utils");

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "AuthenticationRequiredError";
  }
}

export async function getAuthenticatedUser() {
  const user = await requireAuth();
  log.info({ userId: user.id }, "Authenticated user retrieved");
  return user;
}

export const getCurrentUser = cache(async () => {
  const { userId } = await auth();
  if (!userId) return null;

  const existingProfile = await db.userProfile.findUnique({
    where: { id: userId },
  });
  if (existingProfile) return existingProfile;

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
