"use client";
import { useRef, useState } from "react";
import { FileText, FileSearch, Plus, FileType, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CefrBadge } from "./cefr-badge";
import { InlineTranslationPopup } from "./inline-translation-popup";
import { useScrollProgress } from "@/features/reading/hook/use-scroll-progress";
import { useTranslateMutation } from "@/features/reading/api/mutations";
import { useCreateVocabularyMutation } from "@/features/vocabulary/api/mutations";
import { validateWordSelection } from "@/features/reading/utils/word-selection";
import type { WordSelectionAnchor } from "@/features/reading/utils/word-selection";
import type { Passage } from "@/features/passage/schema";
import { YouTubeEmbed } from "./youtube-embed";

export function ContentPanel({
  passage,
  isLoading,
  onOpenUploadModal,
}: {
  passage: Passage | null;
  isLoading: boolean;
  onOpenUploadModal: () => void;
}) {
  const [viewMode, setViewMode] = useState<"text" | "pdf" | "video">(
    "text",
  );
  const [wordAnchor, setWordAnchor] = useState<WordSelectionAnchor | null>(null);
  const translation = useTranslateMutation();
  const createVocabulary = useCreateVocabularyMutation();

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(scrollRef);
  const pdfBlobPathname =
    viewMode === "pdf" && passage?.filePath ? passage.filePath : null;

  const clearTranslation = () => {
    setWordAnchor(null);
    translation.reset();
    window.getSelection()?.removeAllRanges();
  };

  const handlePassageMouseUp = () => {
    if (!passage || viewMode !== "text") return;
    const next = validateWordSelection(
      window.getSelection(),
      contentRef.current,
    );
    if (!next) {
      setWordAnchor(null);
      translation.reset();
      return;
    }
    const current = wordAnchor;
    if (
      current &&
      current.word === next.word &&
      current.context === next.context
    ) {
      return;
    }
    setWordAnchor(next);
    translation.reset();
  };

  const handleTranslateClick = () => {
    if (!wordAnchor) return;
    translation.mutate({ word: wordAnchor.word, context: wordAnchor.context });
  };

  const handleSaveVocabulary = () => {
    const result = translation.data;
    if (!result || !wordAnchor) return;
    createVocabulary.mutate({
      term: result.lemma,
      translation: result.translation,
      sourceLanguage: "en",
      targetLanguage: "vi",
      partofSpeech: result.partOfSpeech,
    });
  };
  if (!passage) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            <span>Đang tải tài liệu...</span>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-full min-h-100">
        <div className="text-center">
          <FileSearch className="w-7 h-7 text-muted-foreground mx-auto mb-4" aria-hidden />
          <p className="text-base font-medium text-foreground">
            Chọn tài liệu từ Nguồn
          </p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Chọn tài liệu gần đây hoặc thêm tài liệu mới
          </p>
          <button
            onClick={onOpenUploadModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Thêm nguồn
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="h-[3px] w-full bg-border shrink-0"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-gradient-to-r from-primary to-coral transition-[width] duration-150 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="h-[53px] shrink-0 flex items-center gap-3 px-6 border-b border-border/20">
        <div className="flex items-center gap-3">
          <CefrBadge level={passage.cefrLevel} />
          <span className="w-px h-3.5 bg-border" />
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            {passage.wordCount} từ
          </span>
        </div>

        <div className="ml-auto">
          {passage.sourceType === "YOUTUBE" && (
            <SegmentedToggle
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: "text", label: "Bài đọc" },
                { value: "video", label: "Video" },
              ]}
            />
          )}
          {passage.sourceType === "PDF" && (
            <SegmentedToggle
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: "text", label: "Bài đọc" },
                { value: "pdf", label: "PDF" },
              ]}
            />
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto panel-scroll px-8 pt-7 pb-20"
      >
        {viewMode === "video" && (
          <YouTubeEmbed url={passage.youtubeUrl ?? ""} />
        )}
        {viewMode === "pdf" && (
          <PdfPlaceholder fileName={pdfBlobPathname ? passage.title : null} />
        )}
        {viewMode === "text" && (
          <div className="max-w-[66ch] mx-auto">
            <h3 className="font-serif text-[27px] font-semibold text-foreground mb-5 leading-tight">
              {passage.title}
            </h3>
            <div
              ref={contentRef}
              className="reading-content text-foreground"
              onMouseUp={handlePassageMouseUp}
            >
              {passage.content.split("\n\n").map((paragraph, i) => (
                <p key={i} className="mb-6 last:mb-0">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
      <InlineTranslationPopup
        anchor={wordAnchor}
        data={translation.data ?? null}
        error={translation.error}
        isPending={translation.isPending}
        isSaving={createVocabulary.isPending}
        isSaved={createVocabulary.isSuccess}
        onTranslate={handleTranslateClick}
        onClose={clearTranslation}
        onSave={handleSaveVocabulary}
      />
    </div>
  );
}

function PdfPlaceholder({ fileName }: { fileName: string | null }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-[42ch] text-center">
        <FileType
          className="w-10 h-10 text-muted-foreground mx-auto mb-3"
          aria-hidden
        />
        {fileName ? (
          <>
            <p className="text-sm font-medium text-foreground">{fileName}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Trình xem PDF đang được phát triển. Hãy dùng tab Bài đọc để đọc
              nội dung đã trích xuất.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Không có tệp nguồn cho bài đọc này
          </p>
        )}
      </div>
    </div>
  );
}

function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string; disabled?: boolean }[];
}) {
  return (
    <div className="inline-flex bg-paper border border-border rounded-[11px] p-[3px]">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => !opt.disabled && onChange(opt.value)}
            disabled={opt.disabled}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs transition-all duration-140",
              active
                ? "bg-surface text-primary font-semibold shadow-sm"
                : opt.disabled
                  ? "text-muted-foreground/40 font-medium cursor-not-allowed"
                  : "text-ink-3 font-medium hover:text-foreground cursor-pointer",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
