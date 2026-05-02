"use client";

import { useState, useCallback } from "react";
import { UploadZone } from "@/components/upload-zone";
import { TextInputArea } from "@/components/text-input-area";
import { Loader2, FileText, Clock, RotateCcw, Languages, Bookmark, Share2 } from "lucide-react";
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
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
          <p className="text-[16px] font-medium text-on-surface">
            Analyzing content...
          </p>
          <p className="text-[14px] text-on-surface-variant mt-1">
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
      <div className="bg-surface-container-lowest rounded-xl p-12 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0px_10px_30px_rgba(46,68,161,0.08)] transition-all flex-1">
        {/* Controls & Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          {passage.simplifiedContent ? (
            <div className="flex bg-surface-container-high p-1 rounded-lg">
              <button
                onClick={() => setViewMode("simplified")}
                className={cn(
                  "px-4 py-1.5 text-[12px] font-medium rounded-md transition-all",
                  viewMode === "simplified"
                    ? "bg-surface-container-lowest shadow-sm text-primary"
                    : "text-on-surface-variant",
                )}
              >
                Simplified ({passage.simplifiedLevel})
              </button>
              <button
                onClick={() => setViewMode("original")}
                className={cn(
                  "px-4 py-1.5 text-[12px] font-medium rounded-md transition-all",
                  viewMode === "original"
                    ? "bg-surface-container-lowest shadow-sm text-primary"
                    : "text-on-surface-variant",
                )}
              >
                Original ({passage.originalLevel})
              </button>
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-3 py-1 bg-primary/10 text-primary rounded-full text-[12px] font-medium border border-primary/20",
              getCEFRColor(level).includes("bg-") ? getCEFRColor(level) : "",
            )}>
              {getCEFRLabel(level)}
            </span>
            <div className="flex items-center gap-1 text-on-surface-variant text-[12px]">
              <Clock className="w-3.5 h-3.5" />
              {readingTime}
            </div>
            <div className="flex items-center gap-1 text-on-surface-variant text-[12px]">
              <FileText className="w-3.5 h-3.5" />
              {passage.wordCount} words
            </div>
          </div>
        </div>

        {/* Text content */}
        <div className="max-w-none">
          <h3 className="text-[24px] font-bold text-on-surface mb-4">
            {passage.title}
          </h3>
          <div className="text-[18px] leading-[1.6] text-on-surface">
            {currentContent.split("\n\n").map((paragraph, i) => (
              <p key={i} className="mb-6 last:mb-0">{paragraph}</p>
            ))}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="mt-8 pt-6 border-t border-outline-variant flex justify-between items-center">
          <button className="flex items-center gap-2 text-primary text-[14px] font-semibold hover:underline">
            <Languages className="w-4 h-4" />
            Translate passage
          </button>
          <div className="flex gap-4">
            <button className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
              <Bookmark className="w-5 h-5 text-on-surface-variant" />
            </button>
            <button className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
              <Share2 className="w-5 h-5 text-on-surface-variant" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Upload state
  return (
    <div className="bg-surface-container-lowest rounded-xl p-12 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0px_10px_30px_rgba(46,68,161,0.08)] transition-all flex-1 flex flex-col">
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setUploadMethod("file")}
          className={cn(
            "px-4 py-2.5 rounded-lg text-[14px] font-semibold transition-all",
            uploadMethod === "file"
              ? "bg-primary text-on-primary shadow-[0px_2px_8px_rgba(16,43,138,0.2)]"
              : "bg-transparent text-on-surface-variant border border-outline-variant hover:text-on-surface",
          )}
        >
          Upload File
        </button>
        <button
          onClick={() => setUploadMethod("text")}
          className={cn(
            "px-4 py-2.5 rounded-lg text-[14px] font-semibold transition-all",
            uploadMethod === "text"
              ? "bg-primary text-on-primary shadow-[0px_2px_8px_rgba(16,43,138,0.2)]"
              : "bg-transparent text-on-surface-variant border border-outline-variant hover:text-on-surface",
          )}
        >
          Paste Text
        </button>
      </div>

      <div className="flex-1">
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
      </div>

      {error && (
        <div className="mt-4 p-3 bg-error-container border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-[14px]">
          <RotateCcw className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
