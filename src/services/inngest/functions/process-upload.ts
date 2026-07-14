import { inngest, UPLOAD_PROCESS_EVENT } from "@/services/inngest/client";
import { prisma } from "@/lib/prisma";
import { step } from "inngest";
import {
  processUpload,
  type UploadProcessorInput,
} from "@/features/upload/services/upload-processor.service";

export const processUploadJob = inngest.createFunction(
  {
    id: "process-upload-job",
    name: "Process Upload Job",
    triggers: [{ event: UPLOAD_PROCESS_EVENT }],
  },
  async ({ event }: { event: { data: UploadProcessorInput } }) => {
    const { jobId, userId } = event.data;

    const failJob = async (error: string) => {
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: { status: "FAILED", error },
      }).catch(() => {});
    };

    try {
      // Stage 1: Update status to PROCESSING
      await step.run("update-job-status-to-processing", async () => {
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: { status: "PROCESSING" },
        });
      });

      // Stage 2: Process upload (orchestrates resolve → normalize → analyze)
      const processedPassage = await step.run("process-upload", async () => {
        return processUpload(event.data);
      });

      // Stage 3: Create passage in database
      await step.run("create-passage", async () => {
        await prisma.passage.create({
          data: {
            id: processedPassage.id,
            userId,
            title: processedPassage.title,
            content: processedPassage.content,
            cefrLevel: processedPassage.cefrLevel as "B1" | "B2" | "C1" | "C2" | "A1" | "A2",
            wordCount: processedPassage.wordCount,
            sourceType: processedPassage.sourceType,
            filePath: processedPassage.filePath,
            createdAt: processedPassage.createdAt,
          },
        });
      });

      // Stage 4: Update status to DONE
      await step.run("update-job-status-to-done", async () => {
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: { status: "DONE", passageId: processedPassage.id },
        });
      });

      return {
        jobId,
        passageId: processedPassage.id,
        cefrLevel: processedPassage.cefrLevel,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await failJob(message);
      throw error;
    }
  }
);
