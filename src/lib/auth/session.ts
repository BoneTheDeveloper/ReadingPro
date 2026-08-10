import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { AppError } from "@/lib/error/app-error";

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requirePageSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

type ApiSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;

/**
 * Auth failure is part of the return type, not an exception. Callers must narrow
 * on `ok` before reaching `session`, so forgetting the guard is a compile error
 * rather than a runtime 401 that depends on withErrorHandling catching it.
 */
type SessionGuard =
  | { ok: true; session: ApiSession }
  | { ok: false; response: Response };

export async function requireApiSession(): Promise<SessionGuard> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: new AppError(
        401,
        "UNAUTHORIZED",
        "Authentication required",
      ).toResponse(),
    };
  }
  return { ok: true, session };
}
