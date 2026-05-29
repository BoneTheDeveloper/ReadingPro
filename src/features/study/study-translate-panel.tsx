"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import * as Sentry from "@sentry/nextjs";
import {
  Loader2,
  Languages,
  Bookmark,
  MessageCircle,
  Volume2,
  BookOpen,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shared/utils";
import type {
  TranslationSelection,
  QuickTranslationData,
  DetailedTranslationData,
} from "./study-types";

interface StudyTranslatePanelProps {
  selection: TranslationSelection;
  quickTranslation: QuickTranslationData | null;
  saved: boolean;
  onSave: () => void;
  onAskAi: (prefilledQuestion: string) => void;
}

interface FetchState {
  loading: boolean;
  detailed: DetailedTranslationData | null;
  key: string;
}

export function StudyTranslatePanel({
  selection,
  quickTranslation,
  saved,
  onSave,
  onAskAi,
}: StudyTranslatePanelProps) {
  const t = useTranslations("Study");
  const [fetchState, setFetchState] = useState<FetchState>({
    loading: false,
    detailed: null,
    key: "",
  });
  const abortRef = useRef<AbortController | null>(null);

  // Reset to loading when selection changes (adjust during rendering, not in effect)
  const selectionKey = buildTranslationSelectionKey(selection);
  if (selectionKey !== fetchState.key) {
    setFetchState({ loading: true, detailed: null, key: selectionKey });
  }

  // Fetch detailed translation when entering loading state
  useEffect(() => {
    if (!fetchState.loading) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    Sentry.addBreadcrumb({
      category: "study-translation",
      level: "info",
      message: "study-translation-detailed-request",
      data: { sourceId: selection.sourceId, selectedTextLength: selection.selectedText.length },
    });

    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: selection.selectedText,
        context: selection.contextSentence,
        sourceId: selection.sourceId,
        sourceLanguage: "en",
        targetLanguage: "vi",
        mode: "detailed",
      }),
      signal: controller.signal,
    })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !json.success) throw new Error("Detailed translation failed");
        return json;
      })
      .then((json) => {
        if (controller.signal.aborted) return;
        setFetchState((prev) => ({ ...prev, loading: false, detailed: json.data }));
        Sentry.addBreadcrumb({
          category: "study-translation",
          level: "info",
          message: "study-translation-detailed-success",
          data: { provider: json.data.provider },
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setFetchState((prev) => ({ ...prev, loading: false }));
        Sentry.addBreadcrumb({
          category: "study-translation",
          level: "error",
          message: "study-translation-detailed-error",
        });
      });

    return () => {
      controller.abort();
    };
  }, [fetchState.loading, fetchState.key, selection.sourceId, selection.selectedText, selection.contextSentence]);

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

  const { loading, detailed } = fetchState;

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

        {/* Quick translation (from popup) */}
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

        {/* Loading detailed */}
        {loading && (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">{t("translationLoading")}</span>
          </div>
        )}

        {/* Detailed translation */}
        {detailed && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Languages className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("translationPopupTitle")}
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground">{detailed.translation}</p>
              {detailed.type && (
                <span className="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {detailed.type}
                </span>
              )}
            </div>

            {detailed.pronunciation && (
              <div className="flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground italic">{detailed.pronunciation}</p>
              </div>
            )}

            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Lightbulb className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Explanation
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{detailed.explanation}</p>
            </div>

            {detailed.meaningInSentence && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    In this sentence
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{detailed.meaningInSentence}</p>
              </div>
            )}

            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Languages className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Sentence translation
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{detailed.sentenceTranslation}</p>
            </div>

            {detailed.examples.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Examples
                </span>
                <ul className="mt-1 space-y-1">
                  {detailed.examples.map((ex, i) => (
                    <li key={i} className="text-sm text-foreground pl-3 border-l-2 border-primary/30">
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detailed.relatedWords.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Related words
                </span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {detailed.relatedWords.map((word, i) => (
                    <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded text-foreground">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="p-3 border-t border-border flex items-center gap-2">
        <Button
          variant={saved ? "ghost" : "outline"}
          size="sm"
          className={cn("h-8 text-xs gap-1.5", saved && "text-muted-foreground")}
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

function buildTranslationSelectionKey(selection: TranslationSelection) {
  return JSON.stringify({
    sourceId: selection.sourceId,
    selectedText: selection.selectedText,
    contextSentence: selection.contextSentence,
    targetLanguage: selection.targetLanguage,
  });
}
