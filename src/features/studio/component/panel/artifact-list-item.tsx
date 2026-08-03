"use client";

import { MoreVertical, Trash2, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/component/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type ArtifactStatus = "ready" | "pending" | "failed";

interface ArtifactListItemProps {
  title: string;
  icon: LucideIcon;
  status: ArtifactStatus;
  subtitle: string | null;
  errorMessage?: string | null;
  onClick: () => void;
  onDelete?: () => void;
}

export function ArtifactListItem({
  title,
  icon: Icon,
  status,
  subtitle,
  errorMessage,
  onClick,
  onDelete,
}: ArtifactListItemProps) {
  const isReady = status === "ready";
  const isPending = status === "pending";
  const isFailed = status === "failed";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { if (isReady) onClick(); }}
      className={cn(
        "group w-full flex items-center gap-2.5 px-3 py-2.5 text-left rounded-[13px] border transition-all outline-none",
        isPending && "border-primary/20 bg-primary/5 cursor-default",
        isReady && "border-border bg-surface hover:border-primary hover:-translate-y-px hover:shadow-card cursor-pointer",
        isFailed && "border-destructive/20 bg-destructive/5 opacity-60 cursor-not-allowed",
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0",
        isFailed ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
        isPending && "animate-processing-fill",
      )}>
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
        ) : (
          <Icon className="w-4 h-4" strokeWidth={2} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-foreground truncate leading-tight">
          {title}
        </p>
        {subtitle ? (
          <p className="text-[11px] font-semibold text-success mt-0.5">
            {subtitle}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
            {isPending ? "Đang tạo..." : isFailed ? errorMessage : null}
          </p>
        )}
      </div>
      {onDelete && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 p-1 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
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
