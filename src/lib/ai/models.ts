/**
 * Model registry. Keys are feature paths (not abstract "purposes") so each
 * task can pick its own model + token budget independently. To tune a
 * specific task's model or budget, change one line here.
 *
 * Add a slot when a new task lands; do not introduce a coarse new purpose
 * category (e.g. "embeddings") unless the same model+budget truly applies
 * to every caller that would use it.
 */
export const MODELS = {
  "studio.chat": {
    id: "gpt-4o-mini",
    maxTokens: 16384,
  },
  "studio.question.generate": {
    id: "gpt-4o-mini",
    maxTokens: 8192,
  },
  "upload.vocabulary.extract": {
    id: "gpt-4o-mini",
    maxTokens: 8192,
  },
  "upload.cefr.detect": {
    id: "gpt-4o-mini",
    maxTokens: 4096,
  },
  "reading.inline-translate": {
    id: "gpt-4o-mini",
    maxTokens: 1024,
  },
} as const;

export type ModelPurpose = keyof typeof MODELS;

export function getModel(purpose: ModelPurpose): string {
  return MODELS[purpose].id;
}
