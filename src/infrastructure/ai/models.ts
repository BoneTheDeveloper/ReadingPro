/**
 * Model registry — single source of truth for AI model configuration.
 *
 * Usage:
 *   import { MODELS, getModel } from "@/infrastructure/ai/models";
 *   const modelId = getModel("chat");
 */

export const MODELS = {
  chat: {
    id: "gpt-4o-mini",
    maxTokens: 16384,
  },
  structured: {
    id: "gpt-4o-mini",
    maxTokens: 8192,
  },
} as const;

export type ModelPurpose = keyof typeof MODELS;

/**
 * Get model ID for a given purpose.
 * Usage with Vercel AI SDK v7:
 *   import { openai } from "@/infrastructure/ai";
 *   import { getModel } from "@/infrastructure/ai/models";
 *   streamText({ model: openai(getModel("chat")), ... });
 */
export function getModel(purpose: ModelPurpose): string {
  return MODELS[purpose].id;
}
