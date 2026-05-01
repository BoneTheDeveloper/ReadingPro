"use client";

import { useState, useCallback } from "react";
import { UploadZone } from "@/components/upload-zone";
import { TextInputArea } from "@/components/text-input-area";
import { Loader2, FileText, Clock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/shared/utils";
import { calculateReadingTime } from "@/lib/shared/reading-utils";
import { getCEFRColor, getCEFRLabel } from "@/lib/shared/cefr-utils";
import type { StudyStatus, PassageData } from "./study-types";

interface StudyLeftPanelProps {
  status: StudyStatus;
  passage: PassageData | null;
  error: string | null;
  onAnalyze: (text: string, title: string) => void;
}

type ViewMode = "original" | "simplified";

export function StudyLeftPanel({
  status,
  passage,
  error,
  onAnalyze,
}: StudyLeftPanelProps) {
  const [uploadMethod, setUploadMethod] = useState<"file" | "text">("file");
  const [viewMode, setViewMode] = useState<ViewMode>("simplified");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Upload failed");
        }
        const result = await response.json();
        if (result.data?.text) {
          onAnalyze(result.data.text, file.name.replace(/\.(txt|pdf)$/, ""));
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [onAnalyze],
  );

  const handleTextSubmit = useCallback(
    async (text: string) => {
      setIsUploading(true);
      try {
        onAnalyze(text, "Pasted Text");
      } finally {
        setIsUploading(false);
      }
    },
    [onAnalyze],
  );

  const isProcessing = isUploading || status === "analyzing";

  // Processing state
  if (status === "analyzing") {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-neutral-700 font-medium">Analyzing content...</p>
          <p className="text-sm text-neutral-400 mt-1">
            This may take a moment
          </p>
        </div>
      </div>
    );
  }

  // Reading state
  if (status === "ready" && passage) {
    const currentContent =
      viewMode === "simplified" && passage.simplifiedContent
        ? passage.simplifiedContent
        : passage.content;
    const currentLevel =
      viewMode === "simplified"
        ? passage.simplifiedLevel
        : passage.originalLevel;
    const level = (currentLevel || passage.originalLevel || "B2") as Parameters<
      typeof getCEFRColor
    >[0];
    const readingTime = calculateReadingTime(passage.wordCount, level);

    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-neutral-900 mb-4">
            {passage.title}
          </h2>

          <div className="flex flex-wrap gap-3 mb-4 pb-3 border-b border-neutral-200 text-sm text-neutral-500">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{readingTime}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span>{passage.wordCount} words</span>
            </div>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-semibold",
                getCEFRColor(level),
              )}
            >
              {getCEFRLabel(level)}
            </span>
          </div>

          {passage.simplifiedContent && (
            <div className="flex items-center gap-2 mb-4 p-1 bg-neutral-100 rounded-lg">
              <button
                onClick={() => setViewMode("original")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  viewMode === "original"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900",
                )}
              >
                Original ({passage.originalLevel})
              </button>
              <button
                onClick={() => setViewMode("simplified")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  viewMode === "simplified"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900",
                )}
              >
                Simplified ({passage.simplifiedLevel})
              </button>
            </div>
          )}

          <div className="font-serif text-lg leading-loose text-neutral-800">
            {currentContent.split("\n\n").map((paragraph, i) => (
              <p key={i} className="mb-4 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Upload state (idle, uploading, or error)
  return (
    <div className="p-6">
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setUploadMethod("file")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            uploadMethod === "file"
              ? "bg-primary-600 text-white"
              : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50",
          )}
        >
          Upload File
        </button>
        <button
          onClick={() => setUploadMethod("text")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            uploadMethod === "text"
              ? "bg-primary-600 text-white"
              : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50",
          )}
        >
          Paste Text
        </button>
      </div>

      {uploadMethod === "file" ? (
        <UploadZone
          onFileSelect={handleFileUpload}
          isProcessing={isProcessing}
          disabled={isProcessing}
        />
      ) : (
        <TextInputArea
          onSubmit={handleTextSubmit}
          isProcessing={isProcessing}
          disabled={isProcessing}
        />
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <RotateCcw className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
