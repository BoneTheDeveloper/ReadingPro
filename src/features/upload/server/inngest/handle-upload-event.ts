import { inngest } from "@/inngest/client";
import { UPLOAD_PROCESS_EVENT } from "./events";
import { SourceType } from "@/types/passage";
import { prisma } from "@/lib/prisma";
import { step } from "inngest";
import {
  normalizeTextPipeline,
  analyzeContent,
  computeWordCount,
  sourceTypeToPassageSourceType,
} from "@/features/upload/server/services/upload-ai-pipeline";
import { downloadFile, deleteFile } from "./blob";
import { parsePDF } from "@/features/upload/server/services/parsers/pdf-parser";
import { validateFileContent } from "@/features/upload/lib/upload-validation";
import type { UploadPipelineInput } from "@/features/upload/server/services/upload-ai-pipeline";

export const processUploadJob = inngest.createFunction(
  {
    id: "process-upload-job",
    name: "Process Upload Job",
    triggers: [{ event: UPLOAD_PROCESS_EVENT }],
  },
  async ({ event }: { event: { data: UploadPipelineInput } }) => {
    const { jobId, userId, sourceType, blobPath, text, youtubeUrl, startedAt, passageId, title } = event.data;

    const failJob = async (error: string) => {
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: { status: "FAILED", error },
      }).catch(() => {});
    };

    // Cleanup on failure: delete blob (Passage is created atomically by Inngest, so no partial state)
    const cleanupOnFailure = async () => {
      if (blobPath) {
        await step.run("cleanup-blob", async () => {
          await deleteFile(blobPath).catch(() => {});
        });
      }
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
          case SourceType.TEXT:
            return text ?? "";
          case SourceType.PDF: {
            if (!blobPath) throw new Error("Missing blobPath for PDF upload");
            const buffer = await downloadFile(blobPath);
            if (!buffer) throw new Error("Failed to read uploaded file from storage");
            const contentValidation = await validateFileContent(buffer, "application/pdf");
            if (!contentValidation.valid) throw new Error(contentValidation.error ?? "Invalid PDF content");
            const parsed = await parsePDF(buffer);
            return parsed.text;
          }
          case SourceType.YOUTUBE:
            return text ?? "";
          default:
            throw new Error(`Unsupported sourceType: ${sourceType}`);
        }
      });

      if (!rawText.trim()) {
        throw new Error("Resolved text is empty");
      }

      // Step 3: Analyze content (AI call - idempotent)
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

      // Step 4: Create passage in database (atomic - either all fields or nothing)
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
            youtubeUrl: youtubeUrl || undefined,
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
      await cleanupOnFailure();
      throw error;
    }
  }
);
