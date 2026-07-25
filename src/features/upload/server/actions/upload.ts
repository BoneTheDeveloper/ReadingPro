"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { SourceType } from "@/types/passage";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/infrastructure/inngest";
import { createUploadProcessEvent } from "@/features/upload/server/inngest/events";
import { uploadFile } from "@/infrastructure/storage/index";
import {
  validateFile,
  validateFileContent,
  validateTextContent,
} from "@/features/upload/lib/upload-validation";
import { toPassageData, type PassageModel } from "@/types/passage";
import { extractVideoId, isValidYouTubeUrl } from "@/utils/youtube-url";

// ---------- Schema & Helpers ----------

const uploadYouTubeRequestSchema = z
  .object({
    passageId: z.string().uuid(),
    title: z.string().min(1),
    youtubeUrl: z.string().min(1),
    startedAt: z.number(),
  })
  .strict();

const uploadTextRequestSchema = z
  .object({
    passageId: z.string().uuid(),
    title: z.string().min(1),
    text: z.string().min(1),
    startedAt: z.number(),
  })
  .strict();

function sourceTypeFromExtension(ext: string): SourceType {
  const lower = ext.toLowerCase();
  if (lower === "pdf") return SourceType.PDF;
  return SourceType.TEXT;
}

// ---------- ID Generator ----------

function newJobId() {
  return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ---------- File upload (txt / pdf) ----------
// Client validates for UX, Server validates for SECURITY:
// - Step 1: Shallow check (same as client) for fast rejection
// - Step 2: Deep check (magic numbers) to verify actual file content
//
// One action, two storage paths decided by extension:
// - PDF bytes -> Vercel Blob (blobPath used downstream)
// - TXT bytes -> inlined into the Inngest event (no Blob)

export async function uploadFileAction(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Missing file");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext !== "pdf" && ext !== "txt") {
    throw new Error("Only PDF and plain text files are supported.");
  }

  // Step 1: Shallow validation (fast rejection)
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error ?? "Invalid file");
  }

  const passageId = formData.get("passageId") as string;
  const title = formData.get("title") as string;
  const startedAt = Number(formData.get("startedAt"));

  if (!passageId || !title || isNaN(startedAt)) {
    throw new Error("Missing required fields");
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");
  const userId = session.user.id;
  const jobId = newJobId();
  const blobPath = `uploads/${userId}/${passageId}.${ext}`;
  const sourceType = sourceTypeFromExtension(ext);

  // Job-first: the job exists before any fallible IO
  await prisma.uploadJob.create({
    data: {
      id: jobId,
      userId,
      status: "PENDING",
      sourceType,
      blobPath,
    },
  });

  // These two values are filled inside the try block based on the file kind.
  // Declared outside so the `inngest.send` below can read them.
  let resolvedBlobPath: string | undefined;
  let inlineText: string | undefined;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // Deep validation - verify actual file content using magic numbers
    const contentValidation = await validateFileContent(buffer, file.type);
    if (!contentValidation.valid) {
      await prisma.uploadJob
        .update({ where: { id: jobId }, data: { status: "FAILED", error: contentValidation.error } })
        .catch(() => {});
      throw new Error(contentValidation.error);
    }

    // Single condition: kind of file decides where its bytes go.
    if (ext === "pdf") {
      const stored = await uploadFile(blobPath, buffer, file.type || "application/octet-stream");
      if (!stored) throw new Error("Storage upload returned null");
      resolvedBlobPath = blobPath;
    } else {
      inlineText = buffer.toString("utf-8");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to store file";
    await prisma.uploadJob
      .update({ where: { id: jobId }, data: { status: "FAILED", error: message } })
      .catch(() => {});
    throw new Error(message);
  }

  await inngest.send(
    createUploadProcessEvent({
      jobId,
      userId,
      blobPath: resolvedBlobPath,
      text: inlineText,
      title,
      sourceType,
      passageId,
      startedAt,
    })
  );

  return { success: true as const, data: { jobId } };
}

// ---------- Pasted text ----------
// No file, no parsing, no blob — the text rides inline in the event.

export async function uploadTextAction(input: z.infer<typeof uploadTextRequestSchema>) {
  const parsed = uploadTextRequestSchema.parse(input);
  const contentCheck = validateTextContent(parsed.text);
  if (!contentCheck.valid) {
    throw new Error(contentCheck.error ?? "Invalid text content");
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");
  const userId = session.user.id;
  const jobId = newJobId();

  await prisma.uploadJob.create({
    data: {
      id: jobId,
      userId,
      status: "PENDING",
      sourceType: SourceType.TEXT,
    },
  });

  await inngest.send(
    createUploadProcessEvent({
      jobId,
      userId,
      text: parsed.text,
      title: parsed.title,
      sourceType: SourceType.TEXT,
      passageId: parsed.passageId,
      startedAt: parsed.startedAt,
    })
  );

  return { success: true as const, data: { jobId } };
}

// ---------- YouTube upload ----------
// Fast check: Validate URL + check transcript availability before creating job

export async function uploadYouTubeAction(
  input: z.infer<typeof uploadYouTubeRequestSchema>
) {
  const parsed = uploadYouTubeRequestSchema.parse(input);

  // Step 1: Validate YouTube URL
  if (!isValidYouTubeUrl(parsed.youtubeUrl)) {
    throw new Error("Invalid YouTube URL");
  }

  const videoId = extractVideoId(parsed.youtubeUrl);
  if (!videoId) {
    throw new Error("Could not extract video ID");
  }

  // Step 2: Get transcript from cache (validated on paste)
  const { getCachedTranscriptForUpload } = await import("./check-youtube-transcript");
  const transcript = await getCachedTranscriptForUpload(videoId);

  if (!transcript) {
    // Fallback: user submitted without validation OR cache expired
    throw new Error(
      "Please validate the video before uploading (transcript may have expired)"
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");
  const userId = session.user.id;
  const jobId = newJobId();

  // Create job
  await prisma.uploadJob.create({
    data: {
      id: jobId,
      userId,
      status: "PENDING",
      sourceType: SourceType.YOUTUBE,
    },
  });

  // Send event with transcript for immediate processing
  await inngest.send(
    createUploadProcessEvent({
      jobId,
      userId,
      youtubeUrl: parsed.youtubeUrl,
      text: transcript,
      title: parsed.title,
      sourceType: SourceType.YOUTUBE,
      passageId: parsed.passageId,
      startedAt: parsed.startedAt,
    })
  );

  return { success: true as const, data: { jobId } };
}

export async function getUploadStatus(jobId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");
  const userId = session.user.id;
  const job = await prisma.uploadJob.findUnique({
    where: { id: jobId, userId },
  });

  if (!job) {
    throw new Error("Job not found");
  }

  // When DONE, fetch passage metadata using mapper
  let passage = null;
  if (job.status === "DONE" && job.passageId) {
    const passageRow = await prisma.passage.findUnique({
      where: { id: job.passageId },
      select: {
        id: true,
        title: true,
        content: true,
        cefrLevel: true,
        wordCount: true,
        createdAt: true,
        sourceType: true,
      },
    });
    if (passageRow) {
      // Use mapper - content included but client can ignore for display
      passage = toPassageData(passageRow as PassageModel);
    }
  }

  return {
    success: true,
    data: {
      status: job.status,
      passageId: job.passageId,
      error: job.error,
      passage,
    },
  };
}
