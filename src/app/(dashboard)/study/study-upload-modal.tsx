"use client";

import { useState, useCallback } from "react";
import { X, Upload, Type, Globe, Search, FileText } from "lucide-react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { validateFile, formatFileSize } from "@/lib/validation/upload";
import { cn } from "@/lib/shared/utils";
import { studyUploadAction } from "@/app/actions/study-upload-action";
import type { StudyUploadModalProps } from "./study-types";

type InputMode = "file" | "text" | null;

export function StudyUploadModal({
  isOpen,
  onClose,
  onUploadStart,
  onUploadComplete,
}: StudyUploadModalProps) {
  const [activeMode, setActiveMode] = useState<InputMode>(null);
  const [error, setError] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");

  const handleFileUpload = async (file: File) => {
    const fileName = file.name.replace(/\.(txt|pdf)$/, "");
    onUploadStart(fileName);
    onClose();
    setError(null);
    try {
      const text = await file.text();
      const result = await studyUploadAction({
        text,
        title: fileName,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onUploadComplete(result.passage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleTextSubmit = async () => {
    if (!pastedText.trim()) return;
    onUploadStart("Pasted Text");
    onClose();
    setError(null);
    try {
      const result = await studyUploadAction({
        text: pastedText,
        title: "Pasted Text",
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onUploadComplete(result.passage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);
      if (rejectedFiles.length > 0) {
        const code = rejectedFiles[0].errors[0]?.code;
        if (code === "file-too-large") setError("File size exceeds 10MB limit");
        else if (code === "file-invalid-type")
          setError("Only .txt and .pdf files are supported");
        else setError("Invalid file. Please try again.");
        return;
      }
      if (acceptedFiles.length > 0) {
        const validation = validateFile(acceptedFiles[0]);
        if (!validation.valid) {
          setError(validation.error ?? "Invalid file");
          return;
        }
        handleFileUpload(acceptedFiles[0]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: { "text/plain": [".txt"], "application/pdf": [".pdf"] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
    disabled: false,
  });

  if (!isOpen) return null;

  const blue = {
    primary: "#185FA5",
    active: "#378ADD",
    border: "#B5D4F4",
    surface: "#E6F1FB",
    heading: "#0a1a2e",
    gray: "#6b7b8d",
    inactive: "#4a6080",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 border-b-2"
          style={{ borderColor: blue.primary }}
        >
          <h2
            className="text-[18px] font-semibold"
            style={{ color: blue.heading }}
          >
            Add Source
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[#E6F1FB]"
          >
            <X className="w-5 h-5" style={{ color: blue.gray }} />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-5 pt-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: blue.gray }}
            />
            <input
              placeholder="Search sources on the web..."
              className="w-full pl-10 pr-3 py-2.5 rounded-lg text-[16px] outline-none transition-all focus:ring-2"
              style={{
                backgroundColor: blue.surface,
                color: blue.heading,
                caretColor: blue.primary,
              }}
            />
          </div>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          {/* Drop zone — only shown when no mode active */}
          {activeMode === null && (
            <>
              <div
                {...getRootProps()}
                className={cn(
                  "flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all min-h-",
                )}
                style={{
                  borderColor: isDragActive ? blue.active : blue.border,
                  backgroundColor: isDragActive ? blue.surface : "transparent",
                }}
              >
                <input {...getInputProps()} />
                <Upload
                  className="w-7 h-7 mb-3"
                  style={{ color: blue.primary }}
                />
                <p
                  className="text-[14px] font-medium"
                  style={{ color: blue.primary }}
                >
                  {isDragActive
                    ? "Drop your file here"
                    : "or drop your files here"}
                </p>
                <p className="text-[12px] mt-1" style={{ color: blue.gray }}>
                  .txt, .pdf — max {formatFileSize(10 * 1024 * 1024)}
                </p>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3 mt-5">
                <button
                  onClick={() => setActiveMode("file")}
                  className="flex items-center gap-3 p-4 rounded-xl border transition-all text-left hover:border-[#185FA5]"
                  style={{
                    borderColor: blue.border,
                    backgroundColor: "#ffffff",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = blue.surface;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: blue.surface,
                      borderColor: blue.border,
                    }}
                  >
                    <Upload
                      className="w-4 h-4"
                      style={{ color: blue.primary }}
                    />
                  </div>
                  <div>
                    <p
                      className="text-[13px] font-semibold"
                      style={{ color: blue.heading }}
                    >
                      Upload File
                    </p>
                    <p className="text-[11px]" style={{ color: blue.gray }}>
                      Browse from device
                    </p>
                  </div>
                </button>

                <button
                  disabled
                  className="flex items-center gap-3 p-4 rounded-xl border cursor-not-allowed text-left opacity-50"
                  style={{ borderColor: blue.border }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: blue.surface,
                      borderColor: blue.border,
                    }}
                  >
                    <Globe className="w-4 h-4" style={{ color: blue.gray }} />
                  </div>
                  <div>
                    <p
                      className="text-[13px] font-semibold"
                      style={{ color: blue.gray }}
                    >
                      Website
                    </p>
                    <p className="text-[11px]" style={{ color: blue.gray }}>
                      Coming soon
                    </p>
                  </div>
                </button>

                <button
                  disabled
                  className="flex items-center gap-3 p-4 rounded-xl border cursor-not-allowed text-left opacity-50"
                  style={{ borderColor: blue.border }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: blue.surface,
                      borderColor: blue.border,
                    }}
                  >
                    <FileText
                      className="w-4 h-4"
                      style={{ color: blue.gray }}
                    />
                  </div>
                  <div>
                    <p
                      className="text-[13px] font-semibold"
                      style={{ color: blue.gray }}
                    >
                      Google Drive
                    </p>
                    <p className="text-[11px]" style={{ color: blue.gray }}>
                      Coming soon
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveMode("text")}
                  className="flex items-center gap-3 p-4 rounded-xl border transition-all text-left hover:border-[#185FA5]"
                  style={{
                    borderColor: blue.border,
                    backgroundColor: "#ffffff",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = blue.surface;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: blue.surface,
                      borderColor: blue.border,
                    }}
                  >
                    <Type className="w-4 h-4" style={{ color: blue.primary }} />
                  </div>
                  <div>
                    <p
                      className="text-[13px] font-semibold"
                      style={{ color: blue.heading }}
                    >
                      Paste Text
                    </p>
                    <p className="text-[11px]" style={{ color: blue.gray }}>
                      Copied text
                    </p>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* File picker mode */}
          {activeMode === "file" && (
            <div>
              <button
                onClick={() => setActiveMode(null)}
                className="text-[13px] font-medium mb-3 hover:underline"
                style={{ color: blue.primary }}
              >
                &larr; Back to sources
              </button>
              <div
                {...getRootProps()}
                className={cn(
                  "flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all min-h-55",
                )}
                style={{
                  borderColor: isDragActive ? blue.active : blue.border,
                  backgroundColor: isDragActive ? blue.surface : "transparent",
                }}
              >
                <input {...getInputProps()} />
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 border"
                  style={{
                    backgroundColor: blue.surface,
                    borderColor: blue.border,
                  }}
                >
                  <Upload className="w-7 h-7" style={{ color: blue.primary }} />
                </div>
                <p
                  className="text-[16px] font-semibold mb-1"
                  style={{ color: blue.heading }}
                >
                  {isDragActive ? "Drop your file here" : "Upload a file"}
                </p>
                <p className="text-[13px]" style={{ color: blue.gray }}>
                  Drag and drop, or click to browse
                </p>
                <div
                  className="flex items-center gap-3 mt-3 text-[12px]"
                  style={{ color: blue.gray }}
                >
                  <span>.txt, .pdf</span>
                  <span style={{ color: blue.border }}>|</span>
                  <span>Max {formatFileSize(10 * 1024 * 1024)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Text paste mode */}
          {activeMode === "text" && (
            <div>
              <button
                onClick={() => setActiveMode(null)}
                className="text-[13px] font-medium mb-3 hover:underline"
                style={{ color: blue.primary }}
              >
                &larr; Back to sources
              </button>
              <div
                className="bg-white border rounded-xl overflow-hidden"
                style={{ borderColor: blue.border }}
              >
                <div
                  className="flex items-center gap-2 px-4 py-3 border-b"
                  style={{
                    borderColor: blue.surface,
                    backgroundColor: blue.surface,
                  }}
                >
                  <Type className="w-4 h-4" style={{ color: blue.primary }} />
                  <h3
                    className="text-[13px] font-semibold"
                    style={{ color: blue.primary }}
                  >
                    Paste your text
                  </h3>
                </div>
                <textarea
                  value={pastedText}
                  onChange={(e) => {
                    setPastedText(e.target.value);
                    setError(null);
                  }}
                  placeholder="Paste your English text content here..."
                  className="w-full p-5 min-h-45 resize-none focus:outline-none text-[16px] leading-relaxed"
                  style={{
                    color: blue.heading,
                    backgroundColor: "#ffffff",
                  }}
                />
                <div
                  className="flex items-center justify-between px-4 py-3 border-t"
                  style={{
                    borderColor: blue.surface,
                    backgroundColor: blue.surface,
                  }}
                >
                  <span className="text-[12px]" style={{ color: blue.gray }}>
                    {
                      pastedText
                        .trim()
                        .split(/\s+/)
                        .filter((w) => w).length
                    }{" "}
                    words
                  </span>
                  <button
                    onClick={handleTextSubmit}
                    disabled={pastedText.trim().length === 0}
                    className="px-5 py-2 rounded-lg text-[13px] font-semibold transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed text-white"
                    style={{ backgroundColor: blue.primary }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-300 rounded-lg text-red-700 text-[14px]">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-4 border-t flex justify-end"
          style={{ borderColor: blue.surface }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-[14px] font-medium transition-colors border"
            style={{
              color: blue.primary,
              borderColor: blue.primary,
              backgroundColor: "#ffffff",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = blue.surface;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#ffffff";
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
