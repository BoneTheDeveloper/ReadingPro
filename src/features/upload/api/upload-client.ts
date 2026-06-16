"use client"

import * as Sentry from "@sentry/nextjs"
import { postJson } from "@/shared/api/api-client-utils"
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
      message: "upload-file-api-error",
      data: {
        route: "/api/upload",
        error: "schema_mismatch",
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
  const result = await postJson("/api/upload/text", { text, isText: true }, uploadResponseSchema)
  if ("error" in result) {
    throw new Error(result.error)
  }
  return result.data
}
