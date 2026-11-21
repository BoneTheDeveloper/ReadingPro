"use client";

import { MoreVertical, Trash2, Loader2, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/client/components/ui/dropdown-menu";
import { cn } from "@/client/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TONE_CLASSES, type StudioTone } from "./studio-icon-list";

type ArtifactStatus = "ready" | "pending" | "failed";

interface ArtifactListItemProps {
  title: string;
  icon: LucideIcon;
  tone: StudioTone;
  status: ArtifactStatus;
  subtitle: string | null;
  onClick: () => void;
  onDelete?: () => void;
}

export function ArtifactListItem({
  title,
  icon: Icon,
  tone,
  status,
  subtitle,
  onClick,
  onDelete,
}: ArtifactListItemProps) {
  const isReady = status === "ready";
  const isPending = status === "pending";
  const isFailed = status === "failed";

  return (
    <div
      role="button"
      tabIndex={isReady ? 0 : -1}
      onClick={() => { if (isReady) onClick(); }}
      onKeyDown={(e) => {
        if (isReady && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-[12px] transition-colors outline-none",
        isPending && "cursor-default",
        isFailed && "bg-destructive/5 cursor-default",
        isReady && "hover:bg-surface cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {isPending ? (
        <Loader2 className="w-[18px] h-[18px] shrink-0 text-primary animate-spin" strokeWidth={2} />
      ) : isFailed ? (
        <AlertTriangle className="w-[18px] h-[18px] shrink-0 text-destructive" strokeWidth={2} />
      ) : (
        <Icon className={cn("w-[18px] h-[18px] shrink-0", TONE_CLASSES[tone].icon)} strokeWidth={2} />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
          {title}
        </p>
        {isFailed ? (
          <p className="text-[11px] text-destructive truncate mt-0.5">
            Tạo thất bại — xoá và tạo lại
          </p>
        ) : subtitle ? (
          <p className="text-[11px] font-semibold text-success mt-0.5">
            {subtitle}
          </p>
        ) : (
          isPending && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              Đang tạo...
            </p>
          )
        )}
      </div>
      {onDelete && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Xóa artifact"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="min-w-40">
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-destructive focus:text-destructive font-medium"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Xóa artifact
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
