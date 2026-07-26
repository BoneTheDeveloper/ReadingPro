"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import * as Sentry from "@sentry/nextjs";
import { upload } from "@vercel/blob/client";
import { prepareUploadAction } from "../server/actions/prepare-upload";
import { notifyUploadComplete } from "../server/actions/notify-upload-complete";
import { abortUploadAction } from "../server/actions/abort-upload";
import { uploadTextAction, uploadYouTubeAction, getUploadStatus } from "../server/actions/upload";
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

  const handleTextSubmitInternal = useCallback(
    async ({
      text,
      title,
      scope,
    }: {
      text: string;
      title: string;
      scope: "upload:text" | "upload:txt";
    }) => {
      setIsProcessing(true);
      const startedAt = Date.now();
      const passageId = crypto.randomUUID(); // Client generates UUID for stable key
      try {
        const result = await uploadTextAction({
          passageId, // Client-provided UUID
          title,
          text,
          startedAt,
        });

        const jobId = result.data.jobId;
        onUploadStart?.(title, jobId, passageId);

        const { passage } = await pollJobStatus(jobId);
        return { passageId: passage.id, jobId };
      } catch (error) {
        Sentry.captureException(error, { tags: { scope } });
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

  // TXT files mirror the pasted-text path: read content, send inline as text.
  // No blob, no PDF parser — the worker treats it as a TEXT source.
  const handleTxtUpload = useCallback(
    async (file: File) => {
      const text = await file.text();
      const fileTitle = file.name.replace(/\.txt$/, "");
      return handleTextSubmitInternal({ text, title: fileTitle, scope: "upload:txt" });
    },
    [handleTextSubmitInternal]
  );

  const handleTextSubmit = useCallback(
    async (text: string) =>
      handleTextSubmitInternal({ text, title: "Pasted Text", scope: "upload:text" }),
    [handleTextSubmitInternal]
  );

  const handlePdfUpload = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      const startedAt = Date.now();
      const passageId = crypto.randomUUID();
      const fileTitle = file.name.replace(/\.pdf$/, "");

      try {
        // Step 1: Reserve job and pathname (server action — no file bytes sent here)
        const prep = await prepareUploadAction({
          passageId,
          title: fileTitle,
          startedAt,
          mimeType: file.type,
          size: file.size,
        });

        onUploadStart?.(fileTitle, prep.data.jobId, passageId);

        // Step 2: Upload directly from browser to Vercel Blob
        try {
          await upload(prep.data.pathname, file, {
            access: "private",
            handleUploadUrl: prep.data.handleUploadUrl,
            clientPayload: JSON.stringify({ jobId: prep.data.jobId }),
            multipart: true,
          });
        } catch (err) {
          await abortUploadAction({ jobId: prep.data.jobId }).catch(() => {});
          throw err;
        }

        // Step 3: Signal worker to start processing
        await notifyUploadComplete({
          jobId: prep.data.jobId,
          pathname: prep.data.pathname,
          title: fileTitle,
          passageId,
          startedAt,
        });

        const { passage } = await pollJobStatus(prep.data.jobId);
        return { passageId: passage.id, jobId: prep.data.jobId };
      } catch (error) {
        Sentry.captureException(error, { tags: { scope: "upload:pdf" } });
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
    handlePdfUpload,
    handleTxtUpload,
    handleTextSubmit,
    handleYouTubeSubmit,
  };
}
