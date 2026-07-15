/**
 * Shared AI step utilities for Inngest jobs.
 *
 * Note: Inngest step.run() is used directly in job handlers:
 *   async ({ event, step }) => {
 *     const result = await step.run("step-name", async () => {
 *       return withAITrace({ operation: "...", feature: "...", model: "..." }, () => aiCall());
 *     });
 *   }
 *
 * Import withAITrace from "@/infrastructure/ai/observability" to use in steps.
 */

export { withAITrace, type AITraceContext } from "@/infrastructure/ai/observability";
