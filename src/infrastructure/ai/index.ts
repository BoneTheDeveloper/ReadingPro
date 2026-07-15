/**
 * AI Infrastructure — Public exports
 *
 * Usage:
 *   import { MODELS, getModel, openai, withAITrace } from "@/infrastructure/ai";
 *   import { wrapUserText } from "@/infrastructure/ai/text-utils";
 */

export { MODELS, getModel, type ModelPurpose } from "./models";
export { withAITrace, type AITraceContext } from "./observability";
export { openai } from "./client";
export { wrapUserText } from "./text-utils";
