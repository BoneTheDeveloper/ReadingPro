"use client"

import * as Sentry from "@sentry/nextjs"
import { progressStatsResponseSchema } from "@/contracts/study/study-response-schema"

/**
 * Fetch progress statistics for the current user.
 */
export async function getProgressStats() {
  const response = await fetch("/api/progress/stats")
  const result: unknown = await response.json()
  const parsed = progressStatsResponseSchema.safeParse(result)

  if (!parsed.success || "error" in parsed.data) {
    Sentry.addBreadcrumb({
      category: "progress",
      level: "error",
      message: "progress-stats-schema-error",
      data: { route: "/api/progress/stats" },
    })
    throw new Error("Failed to parse progress stats")
  }

  return parsed.data.data
}
