"use client"

import { postJson } from "@/shared/api/api-client-utils"
import { 
  passageResponseSchema, 
  simplifyPassageActionResponseSchema,
  type CreatePassageRequest 
} from "@/shared/study/passage-schema"

/**
 * Create a new passage (simple creation without full AI analysis).
 */
export async function createPassage(input: CreatePassageRequest) {
  const result = await postJson("/api/study/passages", input, passageResponseSchema)
  if ("error" in result) {
    throw new Error(result.error)
  }
  return result.data
}

/**
 * Delete a passage.
 */
export async function deletePassage(passageId: string) {
  const res = await fetch(`/api/study/passages/${passageId}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({ error: "Failed to delete passage" }))
    throw new Error(json.error || "Failed to delete passage")
  }
  return true
}

/**
 * Simplify a passage's content.
 */
export async function simplifyPassage(passageId: string) {
  const result = await postJson(`/api/study/passages/${passageId}/simplify`, {}, simplifyPassageActionResponseSchema)
  if ("error" in result) {
    throw new Error(result.error)
  }
  return result.data
}
