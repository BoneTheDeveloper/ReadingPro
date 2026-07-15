/**
 * AI Infrastructure — Public exports
 *
 * Usage:
 *   import { MODELS, getModel } from "@/infrastructure/ai";
 *   import { withAITrace } from "@/infrastructure/ai";
 *   import { openai } from "@/infrastructure/ai";
 */

export { MODELS, getModel, type ModelPurpose } from "./models";
export { withAITrace, type AITraceContext } from "./observability";
export { openai, createModel, getProviderModel, type AIProvider } from "./client";
