import "server-only";

import type { TranslationDto } from "@/features/reading/schemas/translation";

const GOOGLE_TRANSLATE_ENDPOINT =
  "https://translate.googleapis.com/translate_a/single";
const TRANSLATE_TIMEOUT_MS = 7_000;

export interface ExecuteTranslateInput {
  text: string;
  context: string;
  sourceId: string;
  sourceLanguage: "en";
  targetLanguage: "vi";
}

type TranslateFailure = {
  ok: false;
  kind: "parse" | "upstream" | "timeout";
  status: number;
};

type TranslateResult =
  | { ok: true; data: TranslationDto }
  | TranslateFailure;

function buildTranslateUrl(input: ExecuteTranslateInput): URL {
  const url = new URL(GOOGLE_TRANSLATE_ENDPOINT);
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", input.sourceLanguage);
  url.searchParams.set("tl", input.targetLanguage);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", input.text);
  return url;
}

function parseTranslation(payload: unknown): string | null {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
    return null;
  }

  const segments = payload[0]
    .map((segment: unknown) =>
      Array.isArray(segment) && typeof segment[0] === "string"
        ? segment[0]
        : "",
    )
    .filter(Boolean);
  const translation = segments.join("").trim();
  return translation.length > 0 ? translation : null;
}

/**
 * Translate one English word through Google's public web translation endpoint.
 * The undocumented provider is isolated here so the route and client contract
 * remain unchanged when this is replaced by the official Cloud API.
 */
export async function executeTranslate(
  input: ExecuteTranslateInput,
): Promise<TranslateResult> {
  try {
    const response = await fetch(buildTranslateUrl(input), {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "english-reading-training-app/0.1",
      },
      signal: AbortSignal.timeout(TRANSLATE_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      return { ok: false, kind: "upstream", status: 502 };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return { ok: false, kind: "parse", status: 502 };
    }

    const payload: unknown = await response.json();
    return {
      ok: true,
      data: {
        translation: parseTranslation(payload),
        ipa: null,
        provider: "google_translate",
      },
    };
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return { ok: false, kind: "timeout", status: 504 };
    }
    return { ok: false, kind: "upstream", status: 502 };
  }
}
