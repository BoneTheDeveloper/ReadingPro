"use client"

import * as Sentry from "@sentry/nextjs"
import { uploadResponseSchema } from "@/shared/upload/upload-response-schema"

/**
 * Upload a file to be processed.
 */
export async function uploadFile(file: File) {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  })

  const json: unknown = await response.json()
  const result = uploadResponseSchema.safeParse(json)

  if (!result.success) {
    Sentry.addBreadcrumb({
      category: "upload",
      level: "error",
      message: "upload-file-schema-error",
      data: {
        route: "/api/upload",
      },
    })
    throw new Error("Upload failed")
  }

  if ("error" in result.data) {
    throw new Error(result.data.error)
  }

  if (!response.ok) {
    throw new Error("Upload failed")
  }

  return result.data.data
}

/**
 * Submit raw text to be processed.
 */
export async function uploadText(text: string) {
  const response = await fetch("/api/upload/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, isText: true }),
  })

  const json: unknown = await response.json()
  const result = uploadResponseSchema.safeParse(json)

  if (!result.success) {
    Sentry.addBreadcrumb({
      category: "upload",
      level: "error",
      message: "upload-text-schema-error",
      data: {
        route: "/api/upload/text",
      },
    })
    throw new Error("Processing failed")
  }

  if ("error" in result.data) {
    throw new Error(result.data.error)
  }

  if (!response.ok) {
    throw new Error("Processing failed")
  }

  return result.data.data
}
