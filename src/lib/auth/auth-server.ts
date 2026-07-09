import "server-only";
import { headers } from "next/headers";
import { auth } from "./auth";
import { prisma } from "@/lib/prisma";
import * as Sentry from "@sentry/nextjs";
import { cache } from "react";

/**
 * Get session from request headers (for use in Server Components/Actions)
 */
export async function getSession() {
  const requestHeaders = await headers();
  return auth.api.getSession({ headers: requestHeaders });
}

/**
 * Get user ID from session. Throws if not authenticated.
 * Use this in Server Actions that require authentication.
 */
export async function getUserId(): Promise<string> {
  const session = await getSession();

  if (!session) {
    throw new Error("Authentication required");
  }

  Sentry.setUser({ id: session.user.id });
  return session.user.id;
}

/**
 * Returns null if not authenticated (for pages that handle auth state).
 * Use this in Server Components.
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();

  if (!session) return null;

  Sentry.setUser({ id: session.user.id });

  return prisma.userProfile.findUnique({
    where: { id: session.user.id },
  });
});
