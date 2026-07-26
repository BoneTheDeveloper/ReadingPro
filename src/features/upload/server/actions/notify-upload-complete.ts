"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { SourceType } from "@/types/passage";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest";
import { createUploadProcessEvent } from "@/features/upload/server/inngest/events";

const notifyUploadCompleteSchema = z.object({
  jobId: z.string().min(1),
  pathname: z.string().min(1),
  title: z.string().min(1),
  passageId: z.string().uuid(),
  startedAt: z.number().int().positive(),
});

export async function notifyUploadComplete(
  input: z.infer<typeof notifyUploadCompleteSchema>
) {
  const parsed = notifyUploadCompleteSchema.parse(input);

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");
  const userId = session.user.id;

  const job = await prisma.uploadJob.findUnique({ where: { id: parsed.jobId } });
  if (!job || job.userId !== userId) throw new Error("Job not found");
  if (job.blobPath !== parsed.pathname) throw new Error("Pathname mismatch");

  // Idempotent: if already past PENDING, treat as success
  if (job.status !== "PENDING") {
    return { success: true as const, data: { jobId: parsed.jobId } };
  }

  const intent = await prisma.fileUploadIntent.findUnique({
    where: { pathname: parsed.pathname },
  });
  if (
    !intent ||
    intent.userId !== userId ||
    intent.expiresAt.getTime() < Date.now()
  ) {
    throw new Error("Upload not found or expired");
  }

  await inngest.send(
    createUploadProcessEvent({
      jobId: parsed.jobId,
      userId,
      blobPath: parsed.pathname,
      title: parsed.title,
      sourceType: SourceType.PDF,
      passageId: parsed.passageId,
      startedAt: parsed.startedAt,
    })
  );

  return { success: true as const, data: { jobId: parsed.jobId } };
}
