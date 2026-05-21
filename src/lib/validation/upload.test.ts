import { describe, expect, it } from "vitest";
import {
  MAX_FILE_SIZE,
  formatFileSize,
  sanitizeFilename,
  sanitizeTitle,
  validateFile,
  validateTextContent,
} from "./upload";

describe("upload validation helpers", () => {
  it("validates size, MIME type, and extension fallbacks", () => {
    expect(validateFile(new File(["hello"], "notes.txt", { type: "text/plain" }))).toEqual({
      valid: true,
    });
    expect(validateFile(new File(["pdf"], "scan.pdf", { type: "" }))).toEqual({ valid: true });
    expect(validateFile(new File(["x".repeat(MAX_FILE_SIZE + 1)], "large.txt"))).toEqual({
      valid: false,
      error: "File size exceeds 10MB limit",
    });
    expect(validateFile(new File(["data"], "image.png", { type: "image/png" }))).toEqual({
      valid: false,
      error: "Only .txt and .pdf files are supported",
    });
  });

  it("validates pasted text length boundaries", () => {
    expect(validateTextContent("   ")).toEqual({ valid: false, error: "Text content is empty" });
    expect(validateTextContent("short")).toEqual({
      valid: false,
      error: "Text is too short (minimum 50 characters)",
    });
    expect(validateTextContent("x".repeat(100001))).toEqual({
      valid: false,
      error: "Text is too long (maximum 100,000 characters)",
    });
    expect(validateTextContent("x".repeat(50))).toEqual({ valid: true });
  });

  it("sanitizes filenames and rejects unsafe names", () => {
    expect(sanitizeFilename("my lesson!.txt")).toEqual({
      valid: true,
      sanitized: "my_lesson_.txt",
    });
    expect(sanitizeFilename("..")).toEqual({ valid: false, error: "Invalid filename" });
    expect(sanitizeFilename("folder..secret.txt")).toEqual({
      valid: false,
      error: "Invalid filename",
    });
    expect(sanitizeFilename("a".repeat(101))).toEqual({
      valid: false,
      error: "Filename exceeds 100 character limit",
    });
  });

  it("sanitizes titles and formats file sizes", () => {
    expect(sanitizeTitle("My_lesson-file!.pdf")).toBe("Mylesson file");
    expect(sanitizeTitle("!!!.txt")).toBe("Untitled");
    expect(formatFileSize(0)).toBe("0 Bytes");
    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(10 * 1024 * 1024)).toBe("10 MB");
  });
});
