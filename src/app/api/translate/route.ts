import "server-only";

import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth/auth";
import { moduleLog } from "@/lib/logger";
import { translateBundle } from "@/features/reading/server/services/translate";
import type {
  TranslateErrorBody,
  TranslateErrorCode,
} from "@/features/reading/schemas/translation";

const translateRequestSchema = z.object({
  text: z.string().min(1).max(50),
  context: z.string().min(1).max(2000),
  sourceId: z.string().uuid(),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
});

const log = moduleLog("api:translate");

const ERROR_STATUS: Record<TranslateErrorCode, number> = {
  unauthenticated: 401,
  bad_request: 400,
  not_found: 404,
  rate_limited: 429,
  upstream: 502,
  timeout: 504,
  parse: 502,
  aborted: 499,
};


export async function POST(req: NextRequest) {
  const start = Date.now();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    log.warn(
      { userId: null, latencyMs: Date.now() - start, outcome: "unauthenticated" },
      "Translate request rejected",
    );
    return Response.json(
      { error: { code: "unauthenticated", message: "Authentication required" } },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: { code: "bad_request", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const parsed = translateRequestSchema.safeParse(body);
  if (!parsed.success) {
    log.warn(
      {
        userId: session.user.id,
        latencyMs: Date.now() - start,
        outcome: "bad_request",
        issues: parsed.error.issues.length,
      },
      "Translate request rejected",
    );
    return Response.json(
      { error: { code: "bad_request", message: "Invalid request body" } },
      { status: 400 },
    );
  }

  const result = await translateBundle(
    {
      text: parsed.data.text,
      context: parsed.data.context,
      sourceLanguage: parsed.data.sourceLanguage,
      targetLanguage: parsed.data.targetLanguage,
    },
    { signal: req.signal },
  );

  const latencyMs = Date.now() - start;

  if (!result.ok) {
    const status = ERROR_STATUS[result.error.code];
    log.warn(
      {
        userId: session.user.id,
        latencyMs,
        provider: "openai",
        outcome: result.error.code,
      },
      "Translate request failed",
    );
    const body: TranslateErrorBody = { error: result.error };
    // 499 is not a standard HTTP status — fall back to 504 if the runtime
    // refuses it.
    return Response.json(body, { status: status === 499 ? 504 : status });
  }

  log.info(
    {
      userId: session.user.id,
      latencyMs,
      provider: "openai",
      outcome: "success",
    },
    "Translate request succeeded",
  );

  return Response.json({
    translation: result.data.translation,
    ipa: result.data.ipa,
    partOfSpeech: result.data.partOfSpeech,
    provider: "openai" as const,
  });
}
