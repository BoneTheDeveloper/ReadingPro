"use client";

import { BookOpen, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { STUDIO_TILES, type StudioGridId } from "./studio-icon-list";
import { StudioArtifactType } from "@/generated/prisma/enums";

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

        return (
          <button
            key={tile.gridId}
            type="button"
            onClick={() => onSelect(tile.gridId)}
            disabled={disabled}
            className={cn(
              "relative overflow-hidden flex flex-col items-center gap-1.5 px-2 py-3.5 rounded-[14px] border bg-surface transition-all",
              !disabled && "border-border hover:border-primary hover:-translate-y-px hover:shadow-card cursor-pointer",
              disabled && "border-border opacity-50 cursor-not-allowed",
            )}
            aria-label={tile.action}
          >
            {isGenerating ? (
              <Loader2
                className="relative z-10 text-primary animate-spin"
                strokeWidth={2}
                size={21}
              />
            ) : (
              <tile.icon
                className={cn(
                  "relative z-10",
                  disabled ? "text-muted-foreground/60" : "text-primary",
                )}
                strokeWidth={2}
                size={21}
              />
            )}
            <span className={cn("relative z-10 text-[11.5px] font-semibold text-center leading-tight", disabled ? "text-muted-foreground/70" : "text-foreground")}>
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
