"use server";

import { z } from "zod";
import { getUserId } from "@/lib/auth/auth-server";
import { prisma } from "@/lib/prisma";
import { inngest, createUploadProcessEvent } from "@/services/inngest/client";
import { uploadFile } from "@/services/storage";
import {
  validateFile,
  validateTextContent,
} from "@/features/upload/lib/upload-validation";
import {
  uploadFileFieldsSchema,
  uploadTextInputSchema,
} from "@/features/upload/schemas/upload.schema";
import { toPassageData, type PassageRow } from "@/types/passage";

function newJobId() {
  return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ---------- File upload (txt / pdf) ----------
// The action is intentionally thin: persist the RAW file, then hand a pointer
// to the background worker. All parsing (which can crash on malformed PDFs)
// happens in the worker, so a bad file becomes a FAILED job, never a crash.

export async function uploadFileAction(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Missing file");
  }
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error ?? "Invalid file");
  }

  const parsed = uploadFileFieldsSchema.parse({
    passageId: formData.get("passageId"),
    title: formData.get("title"),
    sourceType: formData.get("sourceType"),
    startedAt: formData.get("startedAt"),
  });

  const userId = await getUserId();
  const jobId = newJobId();
  const ext = parsed.sourceType === "pdf" ? "pdf" : "txt";
  const blobPath = `uploads/${userId}/${parsed.passageId}.${ext}`;

  // Job-first: the job exists before any fallible IO, so a blob write failure
  // surfaces as FAILED via polling instead of a silent disruption.
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
    const stored = await uploadFile(blobPath, buffer, file.type || "application/octet-stream");
    if (!stored) throw new Error("Storage upload returned null");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to store file";
    await prisma.uploadJob
      .update({ where: { id: jobId }, data: { status: "FAILED", error: message } })
      .catch(() => {});
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

export async function uploadTextAction(input: z.infer<typeof uploadTextInputSchema>) {
  const parsed = uploadTextInputSchema.parse(input);
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
