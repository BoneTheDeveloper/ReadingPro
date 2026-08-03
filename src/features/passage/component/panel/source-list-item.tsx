"use client";

import { File, FileText, PlayCircle, Trash2, MoreVertical, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/component/ui/dropdown-menu";
import type { PassageListItem } from "@/features/passage/schema";
import type { SourceType } from "@/generated/prisma/enums";

const SOURCE_TYPE_VISUAL: Record<SourceType, { icon: LucideIcon; chip: string }> = {
  TEXT: { icon: FileText, chip: "bg-indigo-soft text-primary" },
  PDF: { icon: File, chip: "bg-amber-soft text-amber-text" },
  YOUTUBE: { icon: PlayCircle, chip: "bg-coral-soft text-coral-hover" },
};

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
  const isPending = item.status === "PENDING";
  const isFailed = item.status === "FAILED";

  return (
    <div
      role="button"
      tabIndex={isPending ? -1 : 0}
      onClick={isPending ? undefined : onSelect}
      onKeyDown={(e) => {
        if (isPending) return;
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      className={cn(
        "group w-full px-[11px] py-2.5 flex items-center gap-[11px] rounded-[13px] border transition-all",
        isPending && "cursor-default opacity-70 border-transparent",
        isFailed && "cursor-default border-destructive/20 bg-destructive/5",
        !isPending && !isFailed && "cursor-pointer",
        !isPending && !isFailed && active
          ? "bg-indigo-soft border-indigo-soft-border"
          : !isPending && !isFailed && "border-transparent hover:bg-surface hover:border-border",
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0",
          isPending && "bg-accent text-primary",
          isFailed && "bg-destructive/10 text-destructive",
          !isPending && !isFailed && (active ? "bg-surface text-primary shadow-sm" : chip),
        )}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <h4
          className={cn(
            "text-[13px] truncate leading-tight",
            isFailed && "text-destructive",
            !isFailed && active ? "font-semibold text-primary" : "font-medium text-foreground",
          )}
        >
          {item.title}
        </h4>
        <p
          className={cn(
            "text-[11px] truncate mt-px",
            isPending && "text-muted-foreground",
            isFailed && "text-muted-foreground",
            !isPending && !isFailed && (active ? "text-primary/60" : "text-ink-3"),
          )}
        >
          {isPending
            ? "Đang xử lý..."
            : isFailed
              ? (item.statusError ?? "Tải thất bại")
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
