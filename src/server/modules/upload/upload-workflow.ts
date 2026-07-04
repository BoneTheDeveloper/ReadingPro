import * as Sentry from "@sentry/nextjs";
import { parsePDF } from "@/server/modules/upload/parsers/pdf";
import { deleteFile, uploadFile } from "@/server/storage/blob-storage";
import {
  sanitizeFilename,
  sanitizeTitle,
  validateFile,
  validateTextContent,
} from "@/contracts/upload/upload-validation";
import { analyzeAndPersistContent } from "@/server/modules/upload/content-analysis/content-analysis.service";

export interface FileUploadWorkflowResult {
  filename: string;
  filePath: string;
  passageId: string;
  originalLevel: string;
  simplifiedLevel: string | null;
  questionCount: number;
}

export async function processFileUpload(
  userId: string,
  file: File,
): Promise<FileUploadWorkflowResult> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new UploadWorkflowError(validation.error ?? "Invalid file", 400);
  }

  const nameResult = sanitizeFilename(file.name);
  if (!nameResult.valid || !nameResult.sanitized) {
    throw new UploadWorkflowError(nameResult.error ?? "Invalid filename", 400);
  }

  const filename = `${userId}/${Date.now()}-${nameResult.sanitized}`;
  let storedInStorage = false;

  try {
    Sentry.addBreadcrumb({
      category: "upload",
      message: "Uploading file to blob storage",
      level: "info",
    });
    const buffer = Buffer.from(await file.arrayBuffer());

    // Derive safe MIME type from the validated and sanitized extension instead of trusting user's file.type
    const extension = nameResult.sanitized?.split(".").pop()?.toLowerCase();
    let safeType = "application/octet-stream";
    if (extension === "pdf") {
      safeType = "application/pdf";
    } else if (extension === "txt") {
      safeType = "text/plain";
    }

    const storageResult = await Sentry.startSpan(
      { name: "storage-upload", op: "function" },
      async () => {
        return uploadFile(filename, buffer, safeType);
      },
    );

    if (!storageResult) {
      throw new UploadWorkflowError("Failed to store file", 500);
    }
    storedInStorage = true;

    const text = await extractText(file, buffer);
    const textValidation = validateTextContent(text);
    if (!textValidation.valid) {
      throw new UploadWorkflowError(
        textValidation.error ?? "Extracted text is invalid",
        400,
      );
    }

    const analysis = await analyzeAndPersistContent({
      userId,
      text,
      title: sanitizeTitle(file.name),
      sourceType: file.type === "application/pdf" ? "PDF" : "TEXT",
      filePath: storageResult.pathname,
    });

    return {
      filename,
      filePath: storageResult.pathname,
      ...analysis,
    };
  } catch (error) {
    if (storedInStorage) {
      await deleteFile(filename).catch(() => {});
    }
    throw error;
  }
}

async function extractText(file: File, buffer: Buffer) {
  if (file.type !== "application/pdf") {
    return buffer.toString("utf-8");
  }

  Sentry.addBreadcrumb({
    category: "parse",
    message: "Parsing PDF file",
    level: "info",
  });
  return Sentry.startSpan({ name: "pdf-parse", op: "function" }, async () => {
    const pdf = await parsePDF(buffer);
    return pdf.text;
  });
}

export class UploadWorkflowError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "UploadWorkflowError";
  }
}
