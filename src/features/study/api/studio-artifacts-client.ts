"use client"

import type { QuestionData } from "@/features/study/model/types"

/**
 * Load artifact detail (e.g. quiz questions).
 */
export async function getArtifactDetail(artifactId: string) {
  const res = await fetch(`/api/studio-artifacts/${artifactId}`)
  const json = await res.json()
  
  if (!res.ok) {
    throw new Error(json.error || "Failed to load artifact detail")
  }
  
  return json.data as { questions: QuestionData[] }
}

/**
 * Record a quiz result for an artifact.
 */
export async function recordQuizResult(artifactId: string, stats: { correctCount: number; totalQuestions: number }) {
  const res = await fetch(`/api/studio-artifacts/${artifactId}/quiz-result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stats),
  })
  
  if (!res.ok) {
    const json = await res.json().catch(() => ({ error: "Failed to record quiz result" }))
    throw new Error(json.error || "Failed to record quiz result")
  }
  
  return true
}

/**
 * Reset a quiz result for an artifact.
 */
export async function resetQuizResult(artifactId: string) {
  const res = await fetch(`/api/studio-artifacts/${artifactId}/quiz-result`, {
    method: "DELETE",
  })
  
  if (!res.ok) {
    const json = await res.json().catch(() => ({ error: "Failed to reset quiz result" }))
    throw new Error(json.error || "Failed to reset quiz result")
  }
  
  return true
}
