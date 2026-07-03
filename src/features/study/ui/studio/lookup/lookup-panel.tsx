"use client";

import { useTranslations } from "next-intl";
import * as Sentry from "@sentry/nextjs";
import { Bookmark, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  TranslationSelection,
  QuickTranslationData,
} from "@/features/study/model/types";

interface StudyLookupPanelProps {
  selection: TranslationSelection;
  quickTranslation: QuickTranslationData | null;
  saved: boolean;
  onSave: () => void;
  onAskAi: (prefilledQuestion: string) => void;
}

export function StudyLookupPanel({
  selection,
  quickTranslation,
  saved,
  onSave,
  onAskAi,
}: StudyLookupPanelProps) {
  const t = useTranslations("Study");

  const handleAskAi = () => {
    const question = `Explain "${selection.selectedText}" in this context: "${selection.contextSentence.slice(0, 150)}..."`;
    Sentry.addBreadcrumb({
      category: "study-translation",
      level: "info",
      message: "study-translation-ask-ai-opened",
      data: { sourceId: selection.sourceId },
    });
    onAskAi(question);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto panel-scroll p-4 space-y-4">
        {/* Selected text */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
            {t("translationPopupTitle")}
          </p>
          <p className="text-sm font-medium text-foreground">
            {selection.selectedText}
          </p>
        </div>

        {/* Translation (from popup) */}
        {quickTranslation && (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-primary">
              {quickTranslation.translation}
            </p>
            {quickTranslation.type && (
              <span className="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {quickTranslation.type}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="p-3 border-t border-border flex items-center gap-2">
        <Button
          variant={saved ? "ghost" : "outline"}
          size="sm"
          className={cn(
            "h-8 text-xs gap-1.5",
            saved && "text-muted-foreground",
          )}
          onClick={saved ? undefined : onSave}
          disabled={saved}
        >
          <Bookmark className={cn("w-3.5 h-3.5", saved && "fill-current")} />
          {saved ? t("vocabularySaved") : t("saveVocabulary")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={handleAskAi}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Ask AI
        </Button>
      </div>
    </div>
  );
}
