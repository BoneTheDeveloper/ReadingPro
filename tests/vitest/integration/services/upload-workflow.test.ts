import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { processFileUpload, UploadWorkflowError } from "@/features/upload/upload-workflow";

const storage = vi.hoisted(() => ({
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
}));
const parser = vi.hoisted(() => ({
  parsePDF: vi.fn(),
}));
const analysis = vi.hoisted(() => ({
  analyzeAndPersistContent: vi.fn(),
}));

vi.mock("@/lib/storage/blob-storage", () => ({
  uploadFile: storage.uploadFile,
  deleteFile: storage.deleteFile,
}));

vi.mock("@/lib/parsers/pdf", () => ({
  parsePDF: parser.parsePDF,
}));

vi.mock("@/features/upload/content-analysis-service", () => ({
  analyzeAndPersistContent: analysis.analyzeAndPersistContent,
}));

const validText = "This passage is long enough for upload validation and contains enough words for reading practice.";

function makeFile(name: string, type: string, content = validText) {
  return new File([content], name, { type });
}

describe("processFileUpload", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-05-21T10:00:00.000Z"));
    storage.uploadFile.mockReset();
    storage.deleteFile.mockReset();
    parser.parsePDF.mockReset();
    analysis.analyzeAndPersistContent.mockReset();
    storage.uploadFile.mockResolvedValue({ url: "https://cdn.test/upload.txt", pathname: "stored/path" });
    storage.deleteFile.mockResolvedValue(true);
    parser.parsePDF.mockResolvedValue({ text: validText, pages: 1 });
    analysis.analyzeAndPersistContent.mockResolvedValue({
      passageId: "passage_1",
      originalLevel: "A2",
      simplifiedLevel: null,
      questionCount: 0,
    });
  });

  it("uploads text files, extracts text from the buffer, and persists analysis", async () => {
    const result = await processFileUpload("user_1", makeFile("My Notes.txt", "text/plain"));

    expect(result).toEqual({
      filename: "user_1/1779357600000-My_Notes.txt",
      filePath: "stored/path",
      passageId: "passage_1",
      originalLevel: "A2",
      simplifiedLevel: null,
      questionCount: 0,
    });
    expect(storage.uploadFile).toHaveBeenCalledWith(
      "user_1/1779357600000-My_Notes.txt",
      expect.any(Buffer),
      "text/plain",
    );
    expect(analysis.analyzeAndPersistContent).toHaveBeenCalledWith({
      userId: "user_1",
      text: validText,
      title: "My Notes",
      sourceType: "TEXT",
      filePath: "stored/path",
    });
    expect(parser.parsePDF).not.toHaveBeenCalled();
  });

  it("parses PDFs before analysis", async () => {
    await processFileUpload("user_1", makeFile("Reading.PDF", "application/pdf", "%PDF-test"));

    expect(parser.parsePDF).toHaveBeenCalledWith(expect.any(Buffer));
    expect(analysis.analyzeAndPersistContent).toHaveBeenCalledWith(
      expect.objectContaining({
        text: validText,
        title: "Reading",
        sourceType: "PDF",
      }),
    );
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: "parse" }),
    );
  });

  it("rejects invalid files before storage", async () => {
    await expect(processFileUpload("user_1", makeFile("bad.exe", "application/octet-stream"))).rejects.toMatchObject({
      name: "UploadWorkflowError",
      status: 400,
    });

    expect(storage.uploadFile).not.toHaveBeenCalled();
  });

  it("cleans up stored files when extraction or analysis fails", async () => {
    analysis.analyzeAndPersistContent.mockRejectedValueOnce(new Error("analysis failed"));

    await expect(processFileUpload("user_1", makeFile("notes.txt", "text/plain"))).rejects.toThrow("analysis failed");

    expect(storage.deleteFile).toHaveBeenCalledWith("user_1/1779357600000-notes.txt");
  });

  it("raises a workflow error when storage returns no result", async () => {
    storage.uploadFile.mockResolvedValueOnce(null);

    await expect(processFileUpload("user_1", makeFile("notes.txt", "text/plain"))).rejects.toBeInstanceOf(UploadWorkflowError);
    expect(storage.deleteFile).not.toHaveBeenCalled();
  });
});
