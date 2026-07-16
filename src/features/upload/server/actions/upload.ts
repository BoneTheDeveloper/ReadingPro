"use server";

import { z } from "zod";
import { getUserId } from "@/lib/auth/auth-server";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/infrastructure/inngest";
import { createUploadProcessEvent } from "@/features/upload/server/inngest/events";
import { uploadFile } from "@/infrastructure/storage/index";
import {
  validateFile,
  validateFileContent,
  validateTextContent,
} from "@/features/upload/lib/upload-validation";
import {
  uploadFileRequestSchema,
  uploadTextRequestSchema,
} from "@/features/upload/schemas/upload";
import { toPassageData, type PassageRow } from "@/types/passage";

function newJobId() {
  return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ---------- File upload (txt / pdf) ----------
// Client validates for UX, Server validates for SECURITY:
// - Step 1: Shallow check (same as client) for fast rejection
// - Step 2: Deep check (magic numbers) to verify actual file content

export async function uploadFileAction(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Missing file");
  }

  // Step 1: Shallow validation (fast rejection)
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error ?? "Invalid file");
  }

  const parsed = uploadFileRequestSchema.parse({
    passageId: formData.get("passageId"),
    title: formData.get("title"),
    sourceType: formData.get("sourceType"),
    startedAt: formData.get("startedAt"),
  });

  const userId = await getUserId();
  const jobId = newJobId();
  const ext = parsed.sourceType === "pdf" ? "pdf" : "txt";
  const blobPath = `uploads/${userId}/${parsed.passageId}.${ext}`;

  // Job-first: the job exists before any fallible IO
  await prisma.uploadJob.create({
    data: {
      id: jobId,
      userId,
      status: "PENDING",
      sourceType: parsed.sourceType,
      blobPath,
    },
  });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // Step 2: Deep validation - verify actual file content using magic numbers
    // This prevents attacks where someone renames malware.exe to document.pdf
    const contentValidation = await validateFileContent(buffer, file.type);
    if (!contentValidation.valid) {
      // Mark job as failed and clean up
      await prisma.uploadJob
        .update({ where: { id: jobId }, data: { status: "FAILED", error: contentValidation.error } })
        .catch(() => {});
      throw new Error(contentValidation.error);
    }

    const stored = await uploadFile(blobPath, buffer, file.type || "application/octet-stream");
    if (!stored) throw new Error("Storage upload returned null");
  } catch (error) {
    // If already marked as failed above, don't overwrite
    const message = error instanceof Error ? error.message : "Failed to store file";
    const existingJob = await prisma.uploadJob.findUnique({ where: { id: jobId } });
    if (existingJob?.status !== "FAILED") {
      await prisma.uploadJob
        .update({ where: { id: jobId }, data: { status: "FAILED", error: message } })
        .catch(() => {});
    }
    return { success: true as const, data: { jobId } };
  }

  await inngest.send(
    createUploadProcessEvent({
      jobId,
      userId,
      blobPath,
      title: parsed.title,
      sourceType: parsed.sourceType,
      passageId: parsed.passageId,
      startedAt: parsed.startedAt,
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

  const userId = await getUserId();
  const jobId = newJobId();

  await prisma.uploadJob.create({
    data: {
      id: jobId,
      userId,
      status: "PENDING",
      sourceType: "paste",
    },
  });

  await inngest.send(
    createUploadProcessEvent({
      jobId,
      userId,
      text: parsed.text,
      title: parsed.title,
      sourceType: "paste",
      passageId: parsed.passageId,
      startedAt: parsed.startedAt,
    })
  );

  return { success: true as const, data: { jobId } };
}

export async function getUploadStatus(jobId: string) {
  const userId = await getUserId();
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
      passage = toPassageData(passageRow as PassageRow);
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
