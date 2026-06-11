"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import * as Sentry from "@sentry/nextjs"
import { uploadResponseSchema } from "@/lib/upload/shared/upload-response-schema"

export function useUploadSubmit() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/upload", { method: "POST", body: formData })
      const json: unknown = await response.json()
      const result = uploadResponseSchema.safeParse(json)
      if (!result.success) {
        Sentry.addBreadcrumb({
          category: "upload",
          level: "error",
          message: "upload-file-schema-error",
          data: { route: "/api/upload" },
        })
        throw new Error("Upload failed")
      }
      if ("error" in result.data) throw new Error(result.data.error || "Upload failed")
      if (!response.ok) throw new Error("Upload failed")
      router.push(`/study`)
    } catch (error) {
      console.error("Upload error:", error)
      alert(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTextSubmit = async (text: string) => {
    setIsProcessing(true)
    try {
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
          data: { route: "/api/upload/text" },
        })
        throw new Error("Processing failed")
      }
      if ("error" in result.data) throw new Error(result.data.error || "Processing failed")
      if (!response.ok) throw new Error("Processing failed")
      router.push(`/study`)
    } catch (error) {
      console.error("Text processing error:", error)
      alert(error instanceof Error ? error.message : "Processing failed")
    } finally {
      setIsProcessing(false)
    }
  }

  return { isProcessing, handleFileUpload, handleTextSubmit }
}
