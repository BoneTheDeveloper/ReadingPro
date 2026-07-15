/**
 * @deprecated Use `@/infrastructure/ai/models` instead.
 * This module exists for backward compatibility during migration.
 *
 * Migration:
 *   OLD: import { getStudyChatModelId } from "@/infrastructure/ai/model-config";
 *   NEW: import { getModel } from "@/infrastructure/ai/models";
 *        const modelId = getModel("chat").modelId;
 */

import { getModel } from "./models";

/** @deprecated Use getModel("chat") instead */
export function getStudyChatModelId(): string {
  return getModel("chat").modelId;
}
