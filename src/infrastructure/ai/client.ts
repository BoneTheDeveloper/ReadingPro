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

// Re-export openai for direct usage
export { openai };
