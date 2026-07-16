import "server-only";
import { headers } from "next/headers";
import { auth } from "./auth";
import * as Sentry from "@sentry/nextjs";

/**
 * Get session from request headers (for use in Server Components/Actions)
 */
async function getSession() {
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
