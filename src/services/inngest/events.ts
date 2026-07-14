/**
 * Inngest event registry.
 * Central place that knows all event schemas across features.
 *
 * Note: Inngest v4 uses inline type inference. Each feature defines its own
 * schema in feature/services/inngest/events.ts, and this file serves as
 * documentation of all events in the system.
 */

// Re-export event names for convenience
export { UPLOAD_PROCESS_EVENT } from "@/features/upload/services/inngest/events";

// Future events:
// export const QUIZ_GENERATE_EVENT = "quiz/generate";
// export const STUDIO_GENERATE_EVENT = "studio/generate";
