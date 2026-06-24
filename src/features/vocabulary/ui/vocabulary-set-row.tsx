"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/ui/primitives/button";
import { cn } from "@/ui/utils";
import type {
  VocabularySet,
  VocabularySetType,
} from "../model/vocabulary-types";

const SET_TYPE_TONE: Record<VocabularySetType, string> = {
  MANUAL: "bg-primary/10 text-primary",
  DAILY: "bg-gold-soft text-gold",
  WEEKLY: "bg-amber-soft text-amber-text",
};

const SET_TYPE_LABEL: Record<VocabularySetType, string> = {
  MANUAL: "M",
  DAILY: "D",
  WEEKLY: "W",
};

export function VocabularySetRow({
  set,
  expanded,
  onToggle,
  onDelete,
}: {
  set: VocabularySet;
  expanded: boolean;
  onToggle: () => void;
  onDelete?: () => void;
}) {
  const t = useTranslations("Vocabulary");

  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
        onClick={onToggle}
      >
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md",
            SET_TYPE_TONE[set.type],
          )}
        >
          <span className="text-xs font-bold">{SET_TYPE_LABEL[set.type]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{set.name}</p>
          <p className="text-xs text-muted-foreground">
            {t("setItemCount", { count: set._count.items })}
          </p>
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="size-3" />
          </Button>
        )}
      </button>

      {expanded && (
        <div className="mt-1 ml-8 rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {t("setItemsPlaceholder", { count: set._count.items })}
        </div>
      )}
    </li>
  );
}
