"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { captureClientError } from "@/lib/observability/capture-client-error";
import { uploadFileAction, getUploadStatus } from "../actions";
import type { PassageData } from "@/features/passage/schemas/passage.schema";

type UploadStatus = "PENDING" | "PROCESSING" | "DONE" | "FAILED";

export interface UseUploadSubmitOptions {
  onUploadStart?: (fileName: string, jobId: string, passageId: string) => void;
  onComplete?: (data: { passage: PassageData; jobId: string }) => void;
  onError?: (error: string, jobId?: string, passageId?: string) => void;
}

export function useUploadSubmit(options: UseUploadSubmitOptions = {}) {
  const { onUploadStart, onComplete, onError } = options;
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
    (jobId: string): Promise<{ passage: PassageData; jobId: string }> => {
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

            if (status === "DONE" && result.data.passage) {
              clearPoll();
              setIsProcessing(false);
              const passage = result.data.passage as PassageData;
              const data = { passage, jobId };
              onComplete?.(data);
              resolve(data);
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
    [clearPoll, onComplete]
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      const startedAt = Date.now();
      const passageId = crypto.randomUUID(); // Client generates UUID for stable key
      try {
        const text = file.name.endsWith(".pdf")
          ? ""
          : await file.text();

        const fileTitle = file.name.replace(/\.(txt|pdf)$/, "");
        const result = await uploadFileAction({
          passageId, // Client-provided UUID
          title: fileTitle,
          text: text || "PDF uploaded",
          sourceType: file.name.endsWith(".pdf") ? "pdf" : "txt",
          blobPath: undefined,
          startedAt,
        });

        const jobId = result.data.jobId;
        onUploadStart?.(fileTitle, jobId, passageId);

        const { passage } = await pollJobStatus(jobId);
        return { passageId: passage.id, jobId };
      } catch (error) {
        captureClientError(error, { scope: "upload:file" });
        setIsProcessing(false);
        onError?.(
          error instanceof Error ? error.message : "Upload failed",
          undefined,
          passageId
        );
        throw error;
      }
    },
    [pollJobStatus, onUploadStart, onError]
  );

  const handleTextSubmit = useCallback(
    async (text: string) => {
      setIsProcessing(true);
      const startedAt = Date.now();
      const passageId = crypto.randomUUID(); // Client generates UUID for stable key
      try {
        const result = await uploadFileAction({
          passageId, // Client-provided UUID
          title: "Pasted Text",
          text,
          sourceType: "paste",
          startedAt,
        });

        const jobId = result.data.jobId;
        onUploadStart?.("Pasted Text", jobId, passageId);

        const { passage } = await pollJobStatus(jobId);
        return { passageId: passage.id, jobId };
      } catch (error) {
        captureClientError(error, { scope: "upload:text" });
        setIsProcessing(false);
        onError?.(
          error instanceof Error ? error.message : "Upload failed",
          undefined,
          passageId
        );
        throw error;
      }
    },
    [pollJobStatus, onUploadStart, onError]
  );

  return {
    isProcessing,
    uploadProgress,
    handleFileUpload,
    handleTextSubmit,
  };
}
