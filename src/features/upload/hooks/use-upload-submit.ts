"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import * as Sentry from "@sentry/nextjs";
import { uploadFileAction, uploadTextAction, uploadYouTubeAction, getUploadStatus } from "../server/actions/upload";
import type { PassageData } from "@/types/passage";

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
        // Send the raw file only — the worker reads it back from storage and
        // parses it. No client-side text extraction (PDFs can't be read here).
        const isPdf = file.name.endsWith(".pdf");
        const fileTitle = file.name.replace(/\.(txt|pdf)$/, "");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("passageId", passageId); // Client-provided UUID
        formData.append("title", fileTitle);
        formData.append("sourceType", isPdf ? "pdf" : "txt");
        formData.append("startedAt", String(startedAt));

        const result = await uploadFileAction(formData);

        const jobId = result.data.jobId;
        onUploadStart?.(fileTitle, jobId, passageId);

        const { passage } = await pollJobStatus(jobId);
        return { passageId: passage.id, jobId };
      } catch (error) {
        Sentry.captureException(error, { tags: { scope: "upload:file" } });
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
        const result = await uploadTextAction({
          passageId, // Client-provided UUID
          title: "Pasted Text",
          text,
          startedAt,
        });

        const jobId = result.data.jobId;
        onUploadStart?.("Pasted Text", jobId, passageId);

        const { passage } = await pollJobStatus(jobId);
        return { passageId: passage.id, jobId };
      } catch (error) {
        Sentry.captureException(error, { tags: { scope: "upload:text" } });
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

  const handleYouTubeSubmit = useCallback(
    async (youtubeUrl: string) => {
      setIsProcessing(true);
      const startedAt = Date.now();
      const passageId = crypto.randomUUID(); // Client generates UUID for stable key
      try {
        const result = await uploadYouTubeAction({
          passageId,
          title: "YouTube Video",
          youtubeUrl,
          startedAt,
        });

        const jobId = result.data.jobId;
        onUploadStart?.("YouTube Video", jobId, passageId);

        const { passage } = await pollJobStatus(jobId);
        return { passageId: passage.id, jobId };
      } catch (error) {
        Sentry.captureException(error, { tags: { scope: "upload:youtube" } });
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
    handleYouTubeSubmit,
  };
}
