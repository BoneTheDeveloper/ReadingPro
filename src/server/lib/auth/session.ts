import { auth } from "./auth";
import { AppError } from "@/lib/error/app-error";

function getSession(headers: Headers) {
  return auth.api.getSession({ headers });
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

export async function requireApiSession(req: Request): Promise<SessionGuard> {
  const session = await getSession(req.headers);
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
