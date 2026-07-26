import "server-only";

import type { TranslationDto } from "@/features/reading/schemas/translation";

export interface ExecuteTranslateInput {
  text: string;
  context: string;
  sourceId: string;
  sourceLanguage: "en";
  targetLanguage: "vi";
}

/**
 * Phase 1 placeholder: returns a static fallback translation so the route,
 * hook, and popup can compile and round-trip. Phase 3 replaces this body with
 * a real provider + LRU cache.
 */
export async function executeTranslate(
  input: ExecuteTranslateInput,
): Promise<{ ok: true; data: TranslationDto } | { ok: false; status: number }> {
  void input;
  return {
    ok: true,
    data: {
      translation: "placeholder",
      type: null,
      ipa: null,
      provider: "fallback",
    },
  };
}
