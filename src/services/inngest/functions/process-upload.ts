import { inngest, step, UPLOAD_PROCESS_EVENT, UploadProcessEventData } from "@/services/inngest/client";
import { prisma } from "@/lib/prisma";

export const processUploadJob = inngest.createFunction(
  {
    id: "process-upload-job",
    name: "Process Upload Job",
    triggers: [{ event: UPLOAD_PROCESS_EVENT }],
  },
  async ({ event }: { event: { data: UploadProcessEventData } }) => {
    const { jobId, userId, text, title, sourceType, blobPath } = event.data;

    const failJob = async (error: string) => {
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: { status: "FAILED", error },
      }).catch(() => {});
    };

    try {
      await step.run("update-job-status-to-processing", async () => {
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: { status: "PROCESSING" },
        });
      });

      const cefrLevel = await step.run("detect-cefr-level", async () => {
        // TODO: Implement CEFR detection with AI
        return "B2";
      });

      const passage = await step.run("create-passage", async () => {
        const wordCount = text.split(/\s+/).filter((w: string) => w.length > 0).length;
        // Map upload source types to passage source types (Prisma: TEXT | PDF)
        const sourceTypeMap: Record<string, "TEXT" | "PDF"> = {
          paste: "TEXT",
          txt: "TEXT",
          pdf: "PDF",
          youtube: "TEXT", // YouTube transcripts stored as TEXT
        };
        const passageSourceType = sourceTypeMap[sourceType] ?? "TEXT";
        return prisma.passage.create({
          data: {
            userId,
            title,
            content: text,
            cefrLevel: cefrLevel as "B1" | "B2" | "C1" | "C2" | "A1" | "A2",
            wordCount,
            sourceType: passageSourceType,
            filePath: blobPath || undefined,
          },
        });
      });

      await step.run("update-job-status-to-done", async () => {
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: { status: "DONE", passageId: passage.id },
        });
      });

      return { jobId, passageId: passage.id, cefrLevel };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await failJob(message);
      throw error;
    }
  }
);
