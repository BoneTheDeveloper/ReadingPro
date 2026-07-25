import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "./auth";

/**
 * Cached for the duration of a single request. Multiple callers within the
 * same render (layout + page + nested RSCs) share one call.
 *
 * With cookieCache enabled on the auth instance, this is a signed-cookie read
 * when the cache is warm, and a DB lookup otherwise.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});
