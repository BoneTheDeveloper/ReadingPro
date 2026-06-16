import 'server-only';
import { createModuleLogger } from "@/lib/core/logger";

const log = createModuleLogger("translation:provider");

interface TranslationProviderResult {
  translation: string;
  provider: "google_translate";
}

/**
 * Translate text using a Google Translate-compatible provider.
 * Provider failures throw so the route can return the standard 500 shape.
 */
export async function translateWithProvider(input: {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}): Promise<TranslationProviderResult> {
  const provider = "google_translate";

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${input.sourceLanguage}&tl=${input.targetLanguage}&dt=t&q=${encodeURIComponent(input.text)}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      log.error(
        { context: { status: response.status, provider } },
        "Translation provider returned non-OK status",
      );
      throw new Error(`Translation provider returned status ${response.status}`);
    }

    const data = await response.json();

    const translation = Array.isArray(data?.[0])
      ? (data[0] as string[][]).map((segment) => segment[0]).join("")
      : String(data?.[0] ?? "");

    if (!translation) {
      throw new Error("Translation provider returned empty translation");
    }

    log.debug(
      { context: { provider, textLength: input.text.length, translationLength: translation.length } },
      "Translation completed",
    );

    return { translation, provider };
  } catch (error) {
    log.error(
      { err: error, context: { provider, textLength: input.text.length } },
      "Translation failed",
    );
    throw error;
  }
}
