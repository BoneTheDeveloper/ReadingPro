"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { captureClientError } from "@/lib/observability/capture-client-error";
import { uploadFileAction, getUploadStatus } from "../actions";

type UploadStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";

export function useUploadSubmit() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearPoll();
  }, [clearPoll]);

  const pollJobStatus = useCallback(
    (jobId: string): Promise<{ passageId: string; cefrLevel: string }> => {
      return new Promise((resolve, reject) => {
        let retries = 0;
        const maxRetries = 60; // 2 minutes max

        pollRef.current = setInterval(async () => {
          try {
            if (++retries > maxRetries) {
              clearPoll();
              setIsProcessing(false);
              reject(new Error("Upload timed out"));
              return;
            }

            const result = await getUploadStatus(jobId);
            const status = result.data.status as UploadStatus;

            if (status === "DONE" && result.data.passageId) {
              clearPoll();
              setIsProcessing(false);
              resolve({
                passageId: result.data.passageId,
                cefrLevel: "B2",
              });
            } else if (status === "DONE") {
              clearPoll();
              setIsProcessing(false);
              reject(new Error("Passage ID missing"));
            } else if (status === "FAILED") {
              clearPoll();
              setIsProcessing(false);
              reject(new Error(result.data.error || "Upload failed"));
            } else {
              setUploadProgress(
                status === "PENDING"
                  ? "Preparing..."
                  : status === "PROCESSING"
                    ? "Processing content..."
                    : "..."
              );
            }
          } catch (err) {
            clearPoll();
            setIsProcessing(false);
            reject(err);
          }
        }, 2000);
      });
    },
    [clearPoll]
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      try {
        const text = file.name.endsWith(".pdf")
          ? ""
          : await file.text();

        const result = await uploadFileAction({
          title: file.name.replace(/\.(txt|pdf)$/, ""),
          text: text || "PDF uploaded",
          sourceType: file.name.endsWith(".pdf") ? "pdf" : "txt",
          blobPath: undefined,
        });

        const { passageId } = await pollJobStatus(result.data.jobId);
        router.push(`/study?passageId=${passageId}`);
      } catch (error) {
        captureClientError(error, { scope: "upload:file" });
        setIsProcessing(false);
        throw error;
      }
    },
    [pollJobStatus, router]
  );

  const handleTextSubmit = useCallback(
    async (text: string) => {
      setIsProcessing(true);
      try {
        const result = await uploadFileAction({
          title: "Pasted Text",
          text,
          sourceType: "paste",
        });

        const { passageId } = await pollJobStatus(result.data.jobId);
        router.push(`/study?passageId=${passageId}`);
      } catch (error) {
        captureClientError(error, { scope: "upload:text" });
        setIsProcessing(false);
        throw error;
      }
    },
    [pollJobStatus, router]
  );

  return {
    isProcessing,
    uploadProgress,
    handleFileUpload,
    handleTextSubmit,
  };
}
