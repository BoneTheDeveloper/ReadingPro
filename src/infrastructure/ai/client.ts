/**
 * AI client factory.
 * Single instance wrapping Vercel AI SDK.
 *
 * Usage:
 *   import { openai } from "@/infrastructure/ai";
 *   import { streamText } from "ai";
 *
 *   streamText({ model: openai("gpt-4o-mini"), ... });
 */

import { openai } from "@ai-sdk/openai";

// Future: add openrouter when needed
// import { openrouter } from "@openrouter/ai-sdk-provider";

export type AIProvider = "openai"; // | "openrouter";

const providerModels = {
  openai: openai,
  // openrouter: openrouter,
} as const;

/**
 * Get wrapped model instance for a given provider.
 * Usage:
 *   const model = getProviderModel("openai", "gpt-4o-mini");
 */
export function getProviderModel(provider: AIProvider, modelId: string) {
  return providerModels[provider](modelId);
}

/**
 * Create a wrapped language model with telemetry.
 * This is the primary way to get a model for AI SDK calls.
 */
export function createModel(provider: AIProvider, modelId: string) {
  return getProviderModel(provider, modelId);
}

// Re-export openai for direct usage with ai SDK functions
export { openai };
