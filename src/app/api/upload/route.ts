import { NextRequest } from "next/server";
import { handleUpload } from "@vercel/blob/client";
import { withAuth } from "@/lib/auth/with-auth";
import { prisma } from "@/lib/prisma";
import { UPLOAD_CONFIG } from "@/features/upload/utils/upload-config";

export const POST = withAuth(async (userId: string, req: NextRequest) => {
  const body = await req.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
        if (!pathname) throw new Error("Missing pathname");

        // Parse jobId from clientPayload
        const parsed = clientPayload ? JSON.parse(clientPayload) : null;
        const jobId = parsed?.jobId;
        if (!jobId) throw new Error("Missing jobId in clientPayload");

        // Reject non-PDF
        if (multipart === false) {
          throw new Error("Only PDF files are allowed");
        }

        // Verify the job exists, belongs to the user, and is PENDING
        const job = await prisma.uploadJob.findUnique({
          where: { id: jobId },
        });
        if (!job || job.userId !== userId) {
          throw new Error("Job not found");
        }
        if (job.blobPath !== pathname) {
          throw new Error("Pathname mismatch");
        }
        if (job.status !== "PENDING") {
          throw new Error("Job is not in PENDING state");
        }

        // Upsert FileUploadIntent (idempotent — retries hit the same row)
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await prisma.fileUploadIntent.upsert({
          where: { pathname },
          create: { pathname, userId, expiresAt },
          update: { expiresAt },
        });

        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES,
          tokenPayload: JSON.stringify({ jobId }),
        };
      },
      onUploadCompleted: async () => {
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
});
