"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { uploadFile, uploadText } from "../api-client/upload-client"

export function useUploadSubmit() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true)
    try {
      await uploadFile(file)
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
      await uploadText(text)
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
