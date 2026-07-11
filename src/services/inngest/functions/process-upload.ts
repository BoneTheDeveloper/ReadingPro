import { inngest,UPLOAD_PROCESS_EVENT, UploadProcessEventData } from "@/services/inngest/client";
import { prisma } from "@/lib/prisma";
import { step } from "inngest";
import { downloadFile } from "@/services/storage";
import { parsePDF } from "@/features/upload/lib/pdf-parsers";
export const processUploadJob = inngest.createFunction(
  {
    id: "process-upload-job",
    name: "Process Upload Job",
    triggers: [{ event: UPLOAD_PROCESS_EVENT }],
  },
  async ({ event }: { event: { data: UploadProcessEventData } }) => {
    const { jobId, userId, text, title, sourceType, blobPath, passageId, startedAt } = event.data;

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

      // Resolve the passage text from whichever source this upload used. This is
      // where parsing lives (moved off the client/action): a malformed PDF throws
      // here and the catch below marks the job FAILED — it never crashes upstream.
      const resolvedText = await step.run("resolve-text", async () => {
        switch (sourceType) {
          case "paste":
            return text ?? "";
          case "txt":
          case "pdf": {
            if (!blobPath) throw new Error(`Missing blobPath for ${sourceType} upload`);
            const buffer = await downloadFile(blobPath);
            if (!buffer) throw new Error("Failed to read uploaded file from storage");
            if (sourceType === "pdf") {
              const parsed = await parsePDF(buffer);
              return parsed.text;
            }
            return buffer.toString("utf-8");
          }
          case "youtube":
            // TODO: fetch transcript from event.data.url
            throw new Error("YouTube upload not implemented");
          default:
            throw new Error(`Unsupported sourceType: ${sourceType}`);
        }
      });

      const content = resolvedText.trim();
      if (!content) {
        throw new Error("Resolved text is empty");
      }

      const cefrLevel = await step.run("detect-cefr-level", async () => {
        // TODO: Implement CEFR detection with AI
        return "B2";
      });

      const passage = await step.run("create-passage", async () => {
        const wordCount = content.split(/\s+/).filter((w: string) => w.length > 0).length;
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
            id: passageId, // Use client-provided UUID for stable key
            userId,
            title,
            content,
            cefrLevel: cefrLevel as "B1" | "B2" | "C1" | "C2" | "A1" | "A2",
            wordCount,
            sourceType: passageSourceType,
            filePath: blobPath || undefined,
            createdAt: new Date(startedAt), // Use client timestamp for ordering
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
