"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Sparkles,
  MessageCircle,
  Loader2,
  Languages,
  BookOpen,
  ArrowLeft,
  Layers,
  HelpCircle,
  PanelRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/shared/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  PassageData,
  QuickTranslationData,
  ArtifactsCacheEntry,
  ArtifactRef,
  ArtifactDetailCacheEntry,
  StudioArtifactType,
  StudioActionId,
  TranslationSelection,
} from "@/features/study/model/types";
import { QuizContent } from "./quiz/quiz-content";
import { StudyChatPanel } from "./chat/chat-panel";
import { StudyTranslatePanel } from "./translate/translate-panel";
import { studioResetQuizResultAction } from "@/features/study/actions/studio-artifact-actions";

interface StudyStudioPanelProps {
  artifactsCache: ArtifactsCacheEntry;
  activePassage: PassageData | null;
  hasActivePassage: boolean;
  viewingArtifactRef: ArtifactRef | null;
  onSetViewingArtifact: (ref: ArtifactRef | null) => void;
  artifactDetailById: Record<string, ArtifactDetailCacheEntry>;
  onActionClick: (actionId: StudioActionId) => void;
  collapsed?: boolean;
  onToggleCollapse: () => void;
  translationSelection: TranslationSelection | null;
  quickTranslation: QuickTranslationData | null;
  viewingTranslate: boolean;
  onSetViewingTranslate: (viewing: boolean) => void;
  onSaveVocabulary: () => void;
  vocabularySaved: boolean;
  onRecordQuizResult: (artifactId: string, stats: { correctCount: number; totalQuestions: number }) => void;
  onResetQuizResult: (artifactId: string) => void;
}

const studioActions: {
  id: StudioActionId;
  labelKey: string;
  descriptionKey: string;
  icon: typeof BookOpen;
  disabled?: boolean;
}[] = [
  {
    id: "quiz",
    labelKey: "quiz",
    descriptionKey: "testComprehension",
    icon: HelpCircle,
  },
  {
    id: "flashcard",
    labelKey: "flashcards",
    descriptionKey: "keyVocabulary",
    icon: Layers,
    disabled: true,
  },
  {
    id: "chat",
    labelKey: "chat",
    descriptionKey: "askQuestions",
    icon: MessageCircle,
  },
  {
    id: "translate",
    labelKey: "translate",
    descriptionKey: "vietnameseTranslation",
    icon: Languages,
  },
];

const artifactMeta: Record<
  StudioArtifactType,
  { icon: typeof HelpCircle; labelKey: string }
> = {
  quiz: { icon: HelpCircle, labelKey: "quiz" },
  flashcard: { icon: Layers, labelKey: "flashcards" },
};

function formatRelativeTime(timestamp: string, t: ReturnType<typeof useTranslations<"Study">>): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return t("justNow");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("hoursAgo", { count: hours });
  return t("daysAgo", { count: Math.floor(hours / 24) });
}

export function StudyStudioPanel({
  artifactsCache,
  activePassage,
  hasActivePassage,
  viewingArtifactRef,
  onSetViewingArtifact,
  artifactDetailById,
  onActionClick,
  collapsed = false,
  onToggleCollapse,
  translationSelection,
  quickTranslation,
  viewingTranslate,
  onSetViewingTranslate,
  onSaveVocabulary,
  vocabularySaved,
  onRecordQuizResult,
  onResetQuizResult,
}: StudyStudioPanelProps) {
  const t = useTranslations("Study");
  const [viewingChat, setViewingChat] = useState(false);
  const [chatPrefill, setChatPrefill] = useState<string | null>(null);

  const artifacts = artifactsCache.data ?? [];
  const viewingArtifact = viewingArtifactRef
    ? artifacts.find((r) => r.id === viewingArtifactRef.id) ?? null
    : null;

  if (viewingChat && activePassage) {
    return (
      <Card className="h-full flex flex-col overflow-hidden">
        <CardContent className="p-0 flex flex-col h-full">
          <div className="p-4 flex items-center gap-3 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => {
                setViewingChat(false);
                setChatPrefill(null);
              }}
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </Button>
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground truncate">
              {t("chatAbout", { title: activePassage.title })}
            </h2>
          </div>
          <StudyChatPanel
            key={`${activePassage.id}-${chatPrefill ?? "default"}`}
            passageId={activePassage.id}
            prefilledQuestion={chatPrefill}
          />
        </CardContent>
      </Card>
    );
  }

  if (viewingTranslate && translationSelection && activePassage) {
    return (
      <Card className="h-full flex flex-col overflow-hidden">
        <CardContent className="p-0 flex flex-col h-full">
          <div className="p-4 flex items-center gap-3 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => onSetViewingTranslate(false)}
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Languages className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground truncate">
              {t("translate")}: {translationSelection.selectedText}
            </h2>
          </div>
          <StudyTranslatePanel
            selection={translationSelection}
            quickTranslation={quickTranslation}
            saved={vocabularySaved}
            onSave={onSaveVocabulary}
            onAskAi={(question) => {
              setChatPrefill(question);
              setViewingChat(true);
            }}
          />
        </CardContent>
      </Card>
    );
  }

  if (viewingArtifact) {
    const meta = artifactMeta[viewingArtifact.type] ?? {
      icon: HelpCircle,
      labelKey: viewingArtifact.type,
    };
    const Icon = meta.icon;
    const label = t(meta.labelKey);
    const detail = artifactDetailById[viewingArtifact.id];

    return (
      <Card className="h-full flex flex-col overflow-hidden">
        <CardContent className="p-0 flex flex-col h-full">
          <div className="p-4 flex items-center gap-3 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => onSetViewingArtifact(null)}
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Icon className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground truncate">
              {t("resultTitle", { type: label, title: viewingArtifact.title })}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto panel-scroll p-4">
            {viewingArtifact.type === "quiz" && detail?.questions && (
              <QuizContent
                questions={detail.questions}
                passageTitle={viewingArtifact.title}
                artifactId={viewingArtifact.id}
                onReset={() => onSetViewingArtifact(null)}
                onRecordResult={(stats) => onRecordQuizResult(viewingArtifact.id, stats)}
                onResetResult={() => onResetQuizResult(viewingArtifact.id)}
              />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Collapsed mode: icon-only strip
  if (collapsed) {
    return (
      <Card className="h-full flex flex-col overflow-hidden">
        <CardContent className="p-0 flex flex-col h-full items-center">
          <div className="w-full p-2 flex justify-center border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <PanelRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Icon-only action cards */}
          <div className="w-full px-2 py-2 flex flex-col items-center gap-1">
            {studioActions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  if (action.disabled || !hasActivePassage) return;
                  if (action.id === "chat") setViewingChat(true);
                  else if (action.id === "translate") onSetViewingTranslate(true);
                  else onActionClick(action.id);
                }}
                disabled={action.disabled || !hasActivePassage}
                title={t(action.labelKey)}
                className={cn(
                  "w-11 h-11 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                  action.disabled
                    ? "text-muted-foreground/30 cursor-not-allowed"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <action.icon className="w-5 h-5" />
              </button>
            ))}
          </div>

          {/* Running indicators */}
          {artifacts.filter((r) => r.status === "generating").length > 0 && (
            <div className="w-full px-2 py-1 flex flex-col items-center gap-1">
              {artifacts
                .filter((r) => r.status === "generating")
                .map((r) => (
                  <div
                    key={r.id}
                    className="w-11 h-11 rounded-lg flex items-center justify-center bg-primary/10"
                  >
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  </div>
                ))}
            </div>
          )}

          {/* Completed artifacts as icons */}
          <div className="flex-1 overflow-y-auto panel-scroll w-full px-2 py-1">
            <div className="flex flex-col items-center gap-1">
              {artifacts
                .filter((r) => r.status === "done")
                .map((artifact) => {
                  const meta = artifactMeta[artifact.type] ?? {
                    icon: HelpCircle,
                    labelKey: artifact.type,
                  };
                  const Icon = meta.icon;
                  const label = t(meta.labelKey);
                  return (
                    <button
                      key={artifact.id}
                      onClick={() => onSetViewingArtifact({ type: artifact.type, id: artifact.id })}
                      title={t("resultTitle", { type: label, title: artifact.title })}
                      className="w-11 h-11 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  );
                })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  const runningCount = artifacts.filter((r) => r.status === "generating").length;
  const maxConcurrent = 3;
  const isActionLocked = (actionId: StudioActionId) => {
    if (actionId === "quiz")
      return artifacts.some((r) => r.status === "generating" && r.type === "quiz");
    return false;
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardContent className="p-0 flex flex-col h-full">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("studio")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <PanelRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="px-3 pb-3 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
          {studioActions.map((action) => {
            const locked =
              !action.disabled && hasActivePassage && isActionLocked(action.id);
            const disabled =
              action.disabled ||
              !hasActivePassage ||
              (action.id !== "chat" && runningCount >= maxConcurrent) ||
              locked;

            return (
              <Button
                key={action.id}
                variant="outline"
                onClick={() => {
                  if (disabled) return;
                  if (action.id === "chat") setViewingChat(true);
                  else if (action.id === "translate") onSetViewingTranslate(true);
                  else onActionClick(action.id);
                }}
                disabled={disabled}
                className={cn(
                  "h-auto flex flex-col items-start gap-2 p-3 relative overflow-hidden",
                  action.disabled && "opacity-40 cursor-not-allowed bg-muted",
                  !action.disabled &&
                    !hasActivePassage &&
                    "opacity-50 cursor-not-allowed",
                  !action.disabled &&
                    action.id !== "chat" &&
                    action.id !== "translate" &&
                    hasActivePassage &&
                    runningCount >= maxConcurrent &&
                    !locked &&
                    "opacity-50 cursor-not-allowed",
                  !disabled &&
                    "bg-primary/10 border-primary/15 hover:bg-primary/15 hover:border-primary/30 hover:shadow-sm cursor-pointer",
                )}
              >
                {locked && (
                  <div className="absolute inset-0 z-0 bg-accent animate-[upload-fill_2.8s_ease-in-out_forwards]">
                    <div className="absolute inset-y-0 w-16 right-0 bg-linear-to-r from-transparent via-white/55 to-transparent animate-[upload-shimmer_1.4s_ease-in-out_infinite]" />
                  </div>
                )}
                <div
                  className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center relative z-10",
                    action.disabled
                      ? "bg-muted text-muted-foreground/50"
                      : locked
                        ? "bg-accent text-primary"
                        : "bg-primary/10 text-primary",
                  )}
                >
                  <action.icon className="w-4 h-4" />
                </div>
                <p
                  className={cn(
                    "text-xs font-semibold leading-tight relative z-10",
                    action.disabled
                      ? "text-muted-foreground/50"
                      : "text-foreground",
                  )}
                >
                    {t(action.labelKey)}
                  </p>
              </Button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto panel-scroll px-4 pb-4">
          {artifacts.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
                Results
              </h3>
              {artifacts.map((artifact) => {
                const meta = artifactMeta[artifact.type] ?? {
                  icon: HelpCircle,
                  labelKey: artifact.type,
                };
                const Icon = meta.icon;
                const label = t(meta.labelKey);
                const hasResult = artifact.type === "quiz" && artifact.quizResult;

                return (
                  <div key={artifact.id} className="group relative">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        artifact.status === "done" && onSetViewingArtifact({ type: artifact.type, id: artifact.id })
                      }
                      disabled={artifact.status !== "done"}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 h-auto text-left",
                        artifact.status === "generating" &&
                          "bg-primary/5 border border-primary/15",
                        artifact.status === "done" &&
                          "hover:bg-muted cursor-pointer",
                        artifact.status === "failed" &&
                          "bg-destructive/5 border border-destructive/15 opacity-60",
                      )}
                    >
                      {artifact.status === "generating" ? (
                        <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                      ) : (
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-foreground truncate">
                          {t("resultTitle", { type: label, title: artifact.title })}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-muted-foreground">
                            {artifact.status === "generating"
                              ? t("generating")
                              : artifact.status === "failed"
                                ? t("failed")
                                : formatRelativeTime(
                                    artifact.updatedAt ?? artifact.createdAt,
                                    t,
                                  )}
                          </p>
                          {hasResult && (
                            <span className="text-[11px] font-semibold text-success bg-success-soft px-1.5 py-0.5 rounded">
                              {artifact.quizResult!.correctCount}/{artifact.quizResult!.totalQuestions} · {Math.round(artifact.quizResult!.accuracyRate * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </Button>
                    
                    {hasResult && artifact.status === "done" && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 bg-surface shadow-sm border border-border"
                          title={t("retry")}
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await studioResetQuizResultAction({ artifactId: artifact.id });
                              onResetQuizResult(artifact.id);
                            } catch (err) {
                              console.error("Failed to reset quiz result", err);
                            }
                          }}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {artifacts.length === 0 && hasActivePassage && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Sparkles className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="text-[13px] text-muted-foreground/60">
                {t("noResultsYet")}
              </p>
              <p className="text-[11px] text-muted-foreground/40 mt-1">
                {t("clickCardToGenerate")}
              </p>
            </div>
          )}

          {!hasActivePassage && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BookOpen className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="text-[13px] text-muted-foreground/60">
                {t("selectPassage")}
              </p>
              <p className="text-[11px] text-muted-foreground/40 mt-1">
                {t("uploadOrSelectSources")}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
