export const MODELS = {
  "ai-chat": {
    id: "gpt-4o-mini",
    maxTokens: 16384,
  },
  "question-generate": {
    id: "gpt-4o-mini",
    maxTokens: 8192,
  },
  "vocabulary-extract": {
    id: "gpt-4o-mini",
    maxTokens: 8192,
  },
  "cefr-detect": {
    id: "gpt-4o-mini",
    maxTokens: 4096,
  },
  "inline-translate": {
    id: "gpt-4o-mini",
    maxTokens: 1024,
  },
} as const;

export type ModelPurpose = keyof typeof MODELS;

export function getModel(purpose: ModelPurpose): string {
  return MODELS[purpose].id;
}
