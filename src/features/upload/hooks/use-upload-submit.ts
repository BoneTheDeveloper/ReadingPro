"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { captureClientError } from "@/lib/observability/capture-client-error";
import { uploadFileAction, uploadTextAction } from "../actions";

export function useUploadSubmit() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      await uploadFileAction(file);
      router.push(`/study`);
    } catch (error) {
      captureClientError(error, { scope: "upload:file" });
      alert(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = async (text: string) => {
    setIsProcessing(true);
    try {
      await uploadTextAction({ text });
      router.push(`/study`);
    } catch (error) {
      captureClientError(error, { scope: "upload:text" });
      alert(error instanceof Error ? error.message : "Processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return { isProcessing, handleFileUpload, handleTextSubmit };
}
