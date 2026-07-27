"use client";

import { Loader2, MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ARTIFACT_META } from "./constants";
import type { StudioArtifact } from "@/features/studio-panel/schemas/studio-panel";
interface ArtifactRowProps {
  artifact: StudioArtifact;
  errorMessage?: string | null;
  onClick: () => void;
  onDelete?: () => void;
}

export function ArtifactRow({ artifact, errorMessage, onClick, onDelete }: ArtifactRowProps) {
  const Icon = ARTIFACT_META[artifact.type].icon;
  const isGenerating = artifact.status === "generating";
  const isFailed = artifact.status === "failed";
  const hasResult = artifact.type === "question" && artifact.questionResult;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { if (artifact.status === "done") onClick(); }}
      className={cn(
        "group w-full flex items-center gap-2.5 px-3 py-2.5 text-left rounded-[13px] border transition-all outline-none",
        isGenerating && "border-primary/20 bg-primary/5 cursor-default",
        artifact.status === "done" && "border-border bg-surface hover:border-primary hover:-translate-y-px hover:shadow-card cursor-pointer",
        isFailed && "border-destructive/20 bg-destructive/5 opacity-60 cursor-not-allowed",
      )}
    >
      <div className={cn("w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0", isFailed ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
        {isGenerating ? <Loader2 className="w-4 h-4 text-primary animate-spin" /> : <Icon className="w-4 h-4" strokeWidth={2} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-foreground truncate leading-tight">
          {artifact.title}
        </p>
        {hasResult ? (
          <p className="text-[11px] font-semibold text-success mt-0.5">
            {artifact.questionResult!.correctCount}/{artifact.questionResult!.totalQuestions} · {Math.round(artifact.questionResult!.accuracyRate * 100)}%
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
            {isGenerating ? "Đang tạo..." : isFailed ? errorMessage : null}
          </p>
        )}
      </div>
      {onDelete && artifact.status === "done" && (
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
