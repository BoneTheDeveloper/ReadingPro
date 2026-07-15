/**
 * Job status polling endpoint.
 * GET /api/jobs/[id] - Get job status
 *
 * Note: Inngest job status is tracked via UploadJob table for uploads.
 * For question generation, we check the StudioArtifact table directly.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // For upload jobs, check UploadJob table
    const uploadJob = await prisma.uploadJob.findUnique({
      where: { id },
      select: { status: true, passageId: true, error: true },
    });

    if (uploadJob) {
      return Response.json({
        status: uploadJob.status,
        passageId: uploadJob.passageId,
        error: uploadJob.error,
      });
    }

    // For question generation, check StudioArtifact table by job id stored in metadata
    const artifact = await prisma.studioArtifact.findFirst({
      where: {
        OR: [
          { id }, // Direct artifact ID lookup
          { passageId: id }, // Also support passage ID lookup
        ],
      },
      select: { id: true, status: true, type: true },
    });

    if (artifact) {
      return Response.json({
        status: artifact.status,
        artifactId: artifact.id,
        type: artifact.type,
      });
    }

    return Response.json(
      { error: "Job not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Failed to get job status:", error);
    return Response.json(
      { error: "Failed to get job status" },
      { status: 500 }
    );
  }
}
