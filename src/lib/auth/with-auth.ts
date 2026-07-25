import "server-only";
import { NextRequest } from "next/server";
import { getSession } from "./get-session";

type AuthedHandler = (userId: string, req: NextRequest) => Promise<Response>;

/**
 * Wrap a Next.js route handler with session validation.
 * Returns 401 if no session, otherwise delegates to the handler with the userId.
 *
 * Reads from the cached session helper, so multiple routes in the same request
 * share a single getSession call.
 */
export function withAuth(handler: AuthedHandler) {
  return async (req: NextRequest): Promise<Response> => {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    return handler(session.user.id, req);
  };
}