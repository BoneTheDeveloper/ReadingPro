/**
 * Model registry — single source of truth for AI model configuration.
 *
 * Usage:
 *   import { MODELS, getModel } from "@/infrastructure/ai/models";
 *   const modelId = getModel("chat").modelId;
 */

export const MODELS = {
  chat: {
    id: "gpt-4o-mini",
    provider: "openai",
    maxTokens: 16384,
  },
  structured: {
    id: "gpt-4o-mini",
    provider: "openai",
    maxTokens: 8192,
  },
} as const;

export type ModelPurpose = keyof typeof MODELS;

/**
 * Get model ID for a given purpose.
 * Used with Vercel AI SDK:
 *   ai.streamText({ model: getModel("chat").modelId, ... });
 */
export function getModel(purpose: ModelPurpose): { modelId: string } {
  return { modelId: MODELS[purpose].id };
}
