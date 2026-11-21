"use client";

import { BookOpen, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/client/lib/utils";
import { STUDIO_TILES, TONE_CLASSES, type StudioGridId } from "./studio-icon-list";
import { StudioArtifactType } from "@/shared/enums";

interface StudioGridProps {
  hasActivePassage: boolean;
  pendingTypes: StudioArtifactType[];
  questionPending: boolean;
  flashcardPending: boolean;
  onSelect: (id: StudioGridId) => void;
}

export function StudioGrid({
  hasActivePassage,
  pendingTypes,
  questionPending,
  flashcardPending,
  onSelect,
}: StudioGridProps) {
  return (
    <div className="px-3 pt-3 grid grid-cols-2 gap-2">
      {STUDIO_TILES.map((tile) => {
        const isPendingMutation =
          tile.kind === "generate" &&
          ((tile.gridId === StudioArtifactType.QUESTION && questionPending) ||
            (tile.gridId === StudioArtifactType.FLASHCARD && flashcardPending));
        const isGenerating = tile.kind === "generate" && pendingTypes.includes(tile.gridId);
        const disabled = !hasActivePassage || isPendingMutation || isGenerating;
        const tone = TONE_CLASSES[tile.tone];

        return (
          <button
            key={tile.gridId}
            type="button"
            onClick={() => onSelect(tile.gridId)}
            disabled={disabled}
            className={cn(
              "flex items-center gap-2.5 min-h-11 px-3 py-2.5 rounded-[14px] bg-surface text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !disabled && cn(tone.hoverBg, "cursor-pointer"),
              disabled && "opacity-50 cursor-not-allowed",
            )}
            aria-label={tile.action}
          >
            {isGenerating ? (
              <Loader2 className="shrink-0 text-primary animate-spin" strokeWidth={2} size={18} />
            ) : (
              <tile.icon
                className={cn("shrink-0", disabled ? "text-muted-foreground" : tone.icon)}
                strokeWidth={2}
                size={18}
              />
            )}
            <span className={cn("min-w-0 text-[13px] font-medium leading-tight", disabled ? "text-muted-foreground" : "text-foreground")}>
              {isGenerating ? "Đang tạo..." : tile.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface StudioEmptyStateProps {
  hasActivePassage: boolean;
}

export function StudioEmptyState({ hasActivePassage }: StudioEmptyStateProps) {
  if (hasActivePassage) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Sparkles className="w-8 h-8 text-muted-foreground/30 mb-3" />
        <p className="text-[13px] text-muted-foreground/60">Chưa có kết quả nào</p>
        <p className="text-[11px] text-muted-foreground/40 mt-1">Nhấn vào thẻ để tạo</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <BookOpen className="w-8 h-8 text-muted-foreground/30 mb-3" />
      <p className="text-[13px] text-muted-foreground/60">Chọn một bài đọc</p>
      <p className="text-[11px] text-muted-foreground/40 mt-1">Tải lên hoặc chọn từ nguồn</p>
    </div>
  );
}
