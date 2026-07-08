import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { cache } from "react";
import { syncUser } from "@/features/users/db/sync-user";

// Returns null if not authenticated (for pages that handle auth state)
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

// Throws if not authenticated (for API routes and protected pages)
export async function getUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Authentication required");
  }
  Sentry.setUser({ id: userId });
  return userId;
}
