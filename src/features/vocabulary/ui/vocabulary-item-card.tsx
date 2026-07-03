"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Delete,
  Languages,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type {
  VocabularyItem,
  VocabularyStatus,
} from "../model/vocabulary-types";

interface VocabularyItemCardProps {
  item: VocabularyItem;
  onStatusChange: (id: string, status: VocabularyStatus) => void;
  onDelete: (id: string) => void;
}

// Status badge variants — use the new learning-status tokens from design.md §6
const STATUS_STYLES: Record<VocabularyStatus, string> = {
  NEW: "bg-status-new-bg text-status-new-text",
  LEARNING: "bg-status-learning-bg text-status-learning-text",
  MASTERED: "bg-status-known-bg text-status-known-text",
};

const SOURCE_CONFIG = {
  USER_SAVED: { icon: BookmarkCheck, label: "translate" },
  DICTIONARY: { icon: Languages, label: "dictionary" },
} as const;

export function VocabularyItemCard({
  item,
  onStatusChange,
  onDelete,
}: VocabularyItemCardProps) {
  const t = useTranslations("Vocabulary");
  const [expanded, setExpanded] = useState(false);

  const hasOccurrences = item.occurrences.length > 0;

  const handleDelete = useCallback(() => {
    onDelete(item.id);
  }, [item.id, onDelete]);

  const handleStatusChange = useCallback(
    (status: VocabularyStatus) => {
      onStatusChange(item.id, status);
    },
    [item.id, onStatusChange],
  );

  const sourceConfig =
    SOURCE_CONFIG[item.source as keyof typeof SOURCE_CONFIG] ??
    SOURCE_CONFIG.USER_SAVED;
  const SourceIcon = sourceConfig.icon;

  const lastReviewedLabel = item.lastReviewedAt
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(item.lastReviewedAt))
    : null;

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader>
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{item.displayText}</CardTitle>
            <CardAction>
              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none">
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleStatusChange("NEW")}>
                    {t("markNew")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("LEARNING")}
                  >
                    {t("markLearning")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("MASTERED")}
                  >
                    {t("markMastered")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={handleDelete}
                  >
                    <Delete className="size-3.5" />
                    {t("delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardAction>
          </div>

          <p className="text-sm text-muted-foreground">{item.translation}</p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                STATUS_STYLES[item.status as VocabularyStatus],
              )}
            >
              {t(item.status.toLowerCase() as Lowercase<VocabularyStatus>)}
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              <SourceIcon className="size-3" />
              {t(sourceConfig.label)}
            </span>

            {item.savedCount > 1 && (
              <span className="text-xs text-muted-foreground">
                {t("savedCount", { count: item.savedCount })}
              </span>
            )}

            {lastReviewedLabel && (
              <span className="text-xs text-muted-foreground">
                {t("lastReviewed", { date: lastReviewedLabel })}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      {hasOccurrences && (
        <>
          <button
            type="button"
            className="flex w-full items-center gap-1.5 px-4 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
            {t("occurrences", { count: item.occurrences.length })}
          </button>

          {expanded && (
            <CardContent className="border-t pt-3">
              <ul className="space-y-2">
                {item.occurrences.map((occ) => (
                  <li
                    key={occ.id}
                    className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
                  >
                    {occ.contextSentence && (
                      <p className="line-clamp-2 text-xs italic">
                        &ldquo;{occ.contextSentence}&rdquo;
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </>
      )}
    </Card>
  );
}
