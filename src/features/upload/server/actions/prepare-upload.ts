"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { SourceType } from "@/types/passage";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";

const prepareUploadSchema = z.object({
  passageId: z.string().uuid(),
  title: z.string().min(1),
  startedAt: z.number().int().positive(),
  mimeType: z.string().min(1),
  size: z.number().int().positive().max(10 * 1024 * 1024),
});

function newJobId() {
  return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function prepareUploadAction(
  input: z.infer<typeof prepareUploadSchema>
) {
  const parsed = prepareUploadSchema.parse(input);

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");
  const userId = session.user.id;

  const jobId = newJobId();
  const blobPath = `uploads/${userId}/${parsed.passageId}.pdf`;

  await prisma.uploadJob.create({
    data: {
      id: jobId,
      userId,
      status: "PENDING",
      sourceType: SourceType.PDF,
      blobPath,
    },
  });

  return {
    success: true as const,
    data: {
      jobId,
      pathname: blobPath,
      handleUploadUrl: "/api/upload",
    },
  };
}
