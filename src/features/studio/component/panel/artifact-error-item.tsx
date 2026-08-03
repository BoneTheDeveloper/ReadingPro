"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ArtifactErrorItemProps {
  error: string;
  onDismiss: () => void;
}

/**
 * Inline failure card rendered above the artifact grid. Mirrors the studio
 * list-item padding rhythm so the panel height doesn't jump when an error
 * appears. Bound to a single artifact record by `id` in the parent.
 */
export function ArtifactErrorItem({ error, onDismiss }: ArtifactErrorItemProps): ReactNode {
  return (
    <div
      role="alert"
      className={cn(
        "group w-full flex items-center gap-2.5 px-3 py-2.5 text-left rounded-[13px]",
        "border border-destructive/20 bg-destructive/5 transition-all",
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0",
          "bg-destructive/10 text-destructive",
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold truncate leading-tight text-destructive">
          Tạo artifact thất bại
        </p>
        <p className="text-[11px] truncate mt-0.5 text-muted-foreground">{error}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className={cn(
          "shrink-0 p-1 rounded-lg text-muted-foreground/40",
          "hover:text-foreground hover:bg-muted transition-colors",
        )}
        aria-label="Bỏ qua lỗi"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
