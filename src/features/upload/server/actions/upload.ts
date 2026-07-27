"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { SourceType } from "@/types/passage";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest";
import { createUploadProcessEvent } from "@/features/upload/server/inngest/events";
import {
  validateTextContent,
} from "@/features/upload/utils/upload-validation";
import { toPassageData, type PassageModel } from "@/types/passage";
import { extractVideoId, isValidYouTubeUrl } from "@/utils/youtube-url";
import { fetchTranscript } from "../services/parsers/youtube-transcript";

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

// ---------- ID Generator ----------

function newJobId() {
  return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
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
      updatedAt: new Date(),
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

  // Validate transcript availability before creating job
  const transcript = await fetchTranscript(videoId);
  if (!transcript) {
    throw new Error("Video này không có phụ đề. Hãy thử video khác có phụ đề tiếng Anh.");
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
      sourceType: SourceType.YOUTUBE,
      updatedAt: new Date(),
    },
  });

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
