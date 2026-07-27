import "server-only";

import { headers } from "next/headers";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth/auth";
import { moduleLog } from "@/lib/logger";
import { translateBundle } from "@/features/reading/server/services/translate";
import {
  TranslateRequestSchema,
  type TranslateErrorCode,
} from "@/features/reading/schemas/translation";

const log = moduleLog("api:translate");

const ERROR_STATUS: Record<TranslateErrorCode, number> = {
  cancelled: 499,
  upstream: 502,
  invalid_output: 502,
};

export async function POST(req: NextRequest) {
  const start = Date.now();
  const ctx: Record<string, unknown> = { userId: null, provider: "openai" };

  const send = (
    status: number,
    body: unknown,
    outcome: string,
    extra?: Record<string, unknown>,
  ) => {
    const payload = { ...ctx, ...extra, latencyMs: Date.now() - start, outcome, status };
    if (status < 400) log.info(payload, "Translate request succeeded");
    else log.warn(payload, "Translate request rejected");
    return Response.json(body, { status });
  };

  const failWith = (status: number, outcome: string, message: string, extra?: Record<string, unknown>) =>
    send(status, { error: { message } }, outcome, extra);

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return failWith(401, "unauthenticated", "Authentication required");
  ctx.userId = session.user.id;

  const body = await req.json().catch(() => null);
  const parsed = TranslateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return failWith(400, "bad_request", "Invalid request body", {
      fields: Object.keys(z.flattenError(parsed.error).fieldErrors),
    });
  }
  ctx.sourceId = parsed.data.sourceId;

  const result = await translateBundle(parsed.data, { signal: req.signal });

  return result.ok
    ? send(200, result.data, "success")
    : failWith(ERROR_STATUS[result.error.code], result.error.code, result.error.message);
}
