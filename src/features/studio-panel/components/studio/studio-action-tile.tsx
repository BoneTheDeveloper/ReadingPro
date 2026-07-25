"use client";

import {
  Layers,
  BookOpen,
  HelpCircle,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudioActionId } from "@/features/studio-panel/server/actions/artifact";

type TileSpec = {
  id: StudioActionId;
  labelVi: string;
  icon: typeof HelpCircle;
  enabled: boolean;
};

const STUDIO_GRID_TILES: TileSpec[] = [
  { id: "quiz", labelVi: "Câu hỏi", icon: HelpCircle, enabled: true },
  { id: "flashcard", labelVi: "Flashcards", icon: Layers, enabled: false },
  { id: "summary", labelVi: "Tóm tắt", icon: BookOpen, enabled: false },
  { id: "chat", labelVi: "Trò chuyện", icon: MessageCircle, enabled: true },
];

export function isStudioTileEnabled(actionId: StudioActionId): boolean {
  const tile = STUDIO_GRID_TILES.find((t) => t.id === actionId);
  return tile?.enabled ?? false;
}

interface StudioGridProps {
  hasActivePassage: boolean;
  runningCount: number;
  isActionLocked: (id: StudioActionId) => boolean;
  onSelect: (id: StudioActionId) => void;
}

export function StudioGrid({
  hasActivePassage, runningCount, isActionLocked, onSelect,
}: StudioGridProps) {
  return (
    <div className="px-3 pt-3 grid grid-cols-2 gap-2">
      {STUDIO_GRID_TILES.map((tile) => {
        const enabled = tile.enabled;
        const locked = enabled && hasActivePassage && isActionLocked(tile.id);
        const isOverCap = enabled && hasActivePassage && runningCount >= 3 && tile.id !== "chat" && !locked;
        const disabled = !enabled || !hasActivePassage || isOverCap;

        return (
          <button
            key={tile.id}
            type="button"
            onClick={() => !disabled && onSelect(tile.id)}
            disabled={disabled}
            className={cn(
              "relative overflow-hidden flex flex-col items-center gap-1.5 px-2 py-3.5 rounded-[14px] border bg-surface transition-all",
              !disabled && "border-border hover:border-primary hover:-translate-y-px hover:shadow-card cursor-pointer",
              disabled && "border-border opacity-50 cursor-not-allowed",
            )}
          >
            {locked && (
              <div className="absolute inset-0 z-0 bg-accent animate-[upload-fill_2.8s_ease-in-out_forwards]">
                <div className="absolute inset-y-0 w-16 right-0 bg-linear-to-r from-transparent via-white/55 to-transparent animate-[upload-shimmer_1.4s_ease-in-out_infinite]" />
              </div>
            )}
            <tile.icon
              className={cn("relative z-10", disabled ? "text-muted-foreground/60" : "text-primary")}
              strokeWidth={2}
              size={21}
            />
            <span className={cn("relative z-10 text-[11.5px] font-semibold text-center leading-tight", disabled ? "text-muted-foreground/70" : "text-foreground")}>
              {tile.labelVi}
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
