"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";

const abortUploadSchema = z.object({
  jobId: z.string().min(1),
});

export async function abortUploadAction(
  input: z.infer<typeof abortUploadSchema>
) {
  const parsed = abortUploadSchema.parse(input);

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Authentication required");
  const userId = session.user.id;

  const job = await prisma.uploadJob.findUnique({ where: { id: parsed.jobId } });
  if (!job || job.userId !== userId) throw new Error("Job not found");

  await prisma.uploadJob.update({
    where: { id: parsed.jobId },
    data: { status: "FAILED", error: "Upload aborted" },
  });

  return { success: true as const };
}
