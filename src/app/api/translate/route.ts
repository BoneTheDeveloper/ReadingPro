import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth/auth";
import { executeTranslate } from "@/features/reading/server/services/inline-translate";

const translateRequestSchema = z.object({
  text: z.string().min(1).max(50),
  context: z.string().min(1).max(2000),
  sourceId: z.string().uuid(),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
});

/**
 * Phase 1 placeholder route. Validates auth + payload shape, then delegates
 * to the placeholder service. Phase 3 replaces the body with the real
 * provider + cache implementation.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json();
  const input = translateRequestSchema.parse(body);

  const result = await executeTranslate(input);
  if (!result.ok) {
    return Response.json({ error: "Not found" }, { status: result.status });
  }

  return Response.json(result.data);
}
