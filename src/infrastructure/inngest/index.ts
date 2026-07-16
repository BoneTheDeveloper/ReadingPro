/**
 * Inngest Infrastructure — Unified entry point
 *
 * Usage:
 *   import { inngest } from "@/infrastructure/inngest";          // Client only
 *   import { inngest, inngestFunctions } from "@/infrastructure/inngest"; // Both
 */

export { inngest } from "./client";
export { inngestFunctions } from "./registry";
