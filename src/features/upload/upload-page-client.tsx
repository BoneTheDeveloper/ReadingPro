"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import * as Sentry from "@sentry/nextjs"
import { UploadZone } from "./upload-zone"
import { TextInputArea } from "./text-input-area"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/shared/utils"
import { uploadResponseSchema } from "@/lib/upload/shared/upload-response-schema"

export function UploadPageClient() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadMethod, setUploadMethod] = useState<"file" | "text">("file")

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
      router.push(`/reading/${result.data.data.passageId}`)
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
      router.push(`/reading/${result.data.data.passageId}`)
    } catch (error) {
      console.error("Text processing error:", error)
      alert(error instanceof Error ? error.message : "Processing failed")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-dvh bg-muted">
      <header className="bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">Upload Content</h1>
          <p className="text-muted-foreground">Add reading material for AI-powered analysis</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex gap-4 mb-8">
          <Button
            onClick={() => setUploadMethod("file")}
            variant={uploadMethod === "file" ? "default" : "outline"}
            className={cn(uploadMethod === "file" ? "" : "bg-surface text-foreground")}
          >
            Upload File
          </Button>
          <Button
            onClick={() => setUploadMethod("text")}
            variant={uploadMethod === "text" ? "default" : "outline"}
            className={cn(uploadMethod === "text" ? "" : "bg-surface text-foreground")}
          >
            Paste Text
          </Button>
        </div>

        {uploadMethod === "file" ? (
          <UploadZone onFileSelect={handleFileUpload} isProcessing={isProcessing} disabled={isProcessing} />
        ) : (
          <TextInputArea onSubmit={handleTextSubmit} isProcessing={isProcessing} disabled={isProcessing} />
        )}
      </main>
    </div>
  )
}
