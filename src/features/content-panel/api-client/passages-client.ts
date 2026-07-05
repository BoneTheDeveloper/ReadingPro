"use client"

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
