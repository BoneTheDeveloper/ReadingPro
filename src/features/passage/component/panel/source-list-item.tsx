"use client";

import { File, FileText, PlayCircle, Trash2, MoreVertical, Loader2, AlertTriangle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/component/ui/dropdown-menu";
import type { PassageListItem } from "@/features/passage/schema";
import { ProcessingStatus, type SourceType } from "@/generated/prisma/enums";

const SOURCE_TYPE_VISUAL: Record<SourceType, { icon: LucideIcon; chip: string }> = {
  TEXT: { icon: FileText, chip: "bg-indigo-soft text-primary" },
  PDF: { icon: File, chip: "bg-amber-soft text-amber-text" },
  YOUTUBE: { icon: PlayCircle, chip: "bg-coral-soft text-coral-hover" },
};

// Exhaustive on purpose: a new ProcessingStatus must be a compile error here,
// not a row that silently renders as normal and clickable.
function mapProcessingStatus(status: ProcessingStatus): "ready" | "pending" | "failed" {
  switch (status) {
    case ProcessingStatus.COMPLETED:
      return "ready";
    case ProcessingStatus.FAILED:
      return "failed";
    case ProcessingStatus.PENDING:
      return "pending";
  }
}

function formatDate(createdAt: Date): string {
  return createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface SourceListItemProps {
  item: PassageListItem;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function SourceListItem({ item, active, onSelect, onDelete }: SourceListItemProps) {
  const { icon: Icon, chip } = SOURCE_TYPE_VISUAL[item.sourceType];
  const state = mapProcessingStatus(item.status);
  const isPending = state === "pending";
  const isFailed = state === "failed";
  // Only a ready row can be opened; pending has nothing yet, failed never will.
  const isInteractive = state === "ready";

  return (
    <div
      role="button"
      tabIndex={isInteractive ? 0 : -1}
      onClick={isInteractive ? onSelect : undefined}
      onKeyDown={(e) => {
        if (!isInteractive) return;
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      className={cn(
        "group w-full px-[11px] py-2.5 flex items-center gap-[11px] rounded-[13px] border transition-all",
        !isInteractive
          ? "cursor-default opacity-70 border-transparent"
          : active
            ? "bg-indigo-soft border-indigo-soft-border cursor-pointer"
            : "border-transparent hover:bg-surface hover:border-border cursor-pointer",
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0",
          isFailed
            ? "bg-destructive/10 text-destructive"
            : isPending
              ? "bg-accent text-primary"
              : active
                ? "bg-surface text-primary shadow-sm"
                : chip,
        )}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isFailed ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <div
          className={cn(
            "text-[13px] truncate leading-tight",
            active ? "font-semibold text-primary" : "font-medium text-foreground",
          )}
        >
          {item.title || (isPending ? "Đang tạo bài đọc" : isFailed ? "Bài đọc lỗi" : "")}
        </div>
        <p
          className={cn(
            "text-[11px] truncate mt-px",
            isFailed
              ? "text-destructive"
              : isPending
                ? "text-muted-foreground"
                : active
                  ? "text-primary/60"
                  : "text-ink-3",
          )}
        >
          {isPending
            ? "Đang xử lý..."
            : isFailed
              ? "Xử lý thất bại — xoá và tải lên lại"
              : formatDate(item.createdAt)}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 p-1 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all opacity-0 group-hover:opacity-100"
            aria-label="Tùy chọn"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end" className="min-w-40">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-destructive focus:text-destructive font-medium"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Xóa nguồn
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
