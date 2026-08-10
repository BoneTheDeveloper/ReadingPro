import type { ZodType } from "zod";

/**
 * Client-side mirror of the server's error envelope. Deliberately not a subclass
 * of AppError: that class models server-side throwing and carries toResponse(),
 * which would drag server code into the client bundle.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * The single transport for every queryFn/mutationFn: parses success bodies
 * through Zod and turns failures into a typed ApiError carrying the server's
 * { code, message }.
 */
export async function fetchJson<T>(
  url: string,
  schema: ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);

  if (!res.ok) {
    // Responses that never reached a route handler (proxy 502s, HTML error
    // pages) will not match the envelope; fall back to a generic message
    // rather than surfacing raw markup to the user.
    const body = (await res.json().catch(() => null)) as
      | { error?: { code?: unknown; message?: unknown; details?: unknown } }
      | null;
    const err = body?.error;

    throw new ApiError(
      res.status,
      typeof err?.code === "string" ? err.code : "INTERNAL",
      typeof err?.message === "string" ? err.message : "Đã có lỗi xảy ra",
      err?.details,
    );
  }

  // 204 No Content has no body by definition — calling res.json() on it throws.
  // Callers pass z.void() for these routes.
  if (res.status === 204) return schema.parse(undefined);

  return schema.parse(await res.json());
}
