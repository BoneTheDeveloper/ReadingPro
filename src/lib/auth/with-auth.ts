import "server-only";
import { NextRequest } from "next/server";
import { getSession } from "./get-session";

type AuthedHandler = (userId: string, req: NextRequest) => Promise<Response>;


export function withAuth(handler: AuthedHandler) {
  return async (req: NextRequest): Promise<Response> => {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    return handler(session.user.id, req);
  };
}
