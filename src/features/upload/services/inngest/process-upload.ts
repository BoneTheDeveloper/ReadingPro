import { inngest } from "@/services/inngest";
import { UPLOAD_PROCESS_EVENT } from "./events";
import { prisma } from "@/lib/prisma";
import { step } from "inngest";
import {
  normalizeTextPipeline,
  analyzeContent,
  computeWordCount,
  sourceTypeToPassageSourceType,
} from "@/features/upload/services/upload-processor.service";
import { downloadFile } from "@/services/storage";
import { parsePDF } from "@/features/upload/lib/pdf-parsers";
import type { UploadProcessorInput } from "@/features/upload/services/upload-processor.service";

export const processUploadJob = inngest.createFunction(
  {
    id: "process-upload-job",
    name: "Process Upload Job",
    triggers: [{ event: UPLOAD_PROCESS_EVENT }],
  },
  async ({ event }: { event: { data: UploadProcessorInput } }) => {
    const { jobId, userId, sourceType, blobPath, text, startedAt, passageId, title } = event.data;

    const failJob = async (error: string) => {
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: { status: "FAILED", error },
      }).catch(() => {});
    };

    try {
      // Step 1: Update status to PROCESSING
      await step.run("update-job-status-to-processing", async () => {
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: { status: "PROCESSING" },
        });
      });

      // Step 2: Resolve text from source (I/O - can retry cheaply)
      const rawText = await step.run("resolve-text", async () => {
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
            throw new Error("YouTube upload not implemented");
          default:
            throw new Error(`Unsupported sourceType: ${sourceType}`);
        }
      });

      if (!rawText.trim()) {
        throw new Error("Resolved text is empty");
      }

      // Step 3: Analyze content (AI call - expensive to retry)
      const analysis = await step.run("analyze-content", async () => {
        const normalized = await normalizeTextPipeline(rawText, sourceType);
        const analysisResult = await analyzeContent(normalized);
        const wordCount = computeWordCount(normalized);
        const passageSourceType = sourceTypeToPassageSourceType(sourceType);

        return {
          content: normalized,
          wordCount,
          passageSourceType,
          ...analysisResult,
        };
      });

      // Step 4: Create passage in database
      await step.run("create-passage", async () => {
        await prisma.passage.create({
          data: {
            id: passageId,
            userId,
            title,
            content: analysis.content,
            cefrLevel: analysis.cefrLevel as "B1" | "B2" | "C1" | "C2" | "A1" | "A2",
            wordCount: analysis.wordCount,
            sourceType: analysis.passageSourceType,
            filePath: blobPath || undefined,
            createdAt: new Date(startedAt),
          },
        });
      });

      // Step 5: Update status to DONE
      await step.run("update-job-status-to-done", async () => {
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: { status: "DONE", passageId },
        });
      });

      return {
        jobId,
        passageId,
        cefrLevel: analysis.cefrLevel,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await failJob(message);
      throw error;
    }
  }
);
