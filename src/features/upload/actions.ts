"use server";

import { z } from "zod";
import { getUserId } from "@/lib/auth/auth-server";
import { prisma } from "@/lib/prisma";
import { inngest, createUploadProcessEvent } from "@/services/inngest/client";
import { toPassageData, type PassageRow } from "@/features/passage/schemas/passage.schema";

const uploadFileSchema = z.object({
  passageId: z.string().uuid(), // Client-provided UUID for stable key
  title: z.string().min(1),
  text: z.string().min(1),
  sourceType: z.enum(["paste", "txt", "pdf", "youtube"]),
  blobPath: z.string().optional(),
  startedAt: z.number(), // Client timestamp for ordering
});

export async function uploadFileAction(
  input: z.infer<typeof uploadFileSchema>,
) {
  const parsed = uploadFileSchema.parse(input);
  const userId = await getUserId();

  const jobId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  await prisma.uploadJob.create({
    data: {
      id: jobId,
      userId,
      status: "PENDING",
      sourceType: parsed.sourceType,
      blobPath: parsed.blobPath,
    },
  });

  await inngest.send(
    createUploadProcessEvent({
      jobId,
      userId,
      text: parsed.text,
      title: parsed.title,
      sourceType: parsed.sourceType,
      blobPath: parsed.blobPath || undefined,
      passageId: parsed.passageId, // Client-provided ID
      startedAt: parsed.startedAt,
    })
  );

  return { success: true, data: { jobId } };
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
