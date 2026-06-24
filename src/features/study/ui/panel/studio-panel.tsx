"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  PanelRight,
  HelpCircle,
  Layers,
  ChevronRight,
  X,
  ArrowLeft,
  MessageCircle,
  Languages,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn } from "@/ui/utils";
import { Card, CardContent } from "@/ui/primitives/card";
import { Button } from "@/ui/primitives/button";
import type {
  PassageData,
  QuickTranslationData,
  ArtifactsCacheEntry,
  ArtifactRef,
  ArtifactDetailCacheEntry,
  StudioArtifactType,
  StudioArtifactErrorCode,
  StudioActionId,
  TranslationSelection,
} from "@/features/study/model/types";
import { QuizContent } from "../studio/quiz/quiz-content";
import { StudyChatPanel } from "../studio/chat/chat-panel";
import { StudyLookupPanel } from "../studio/lookup/lookup-panel";
import { resetQuizResult } from "@/features/study/api-client/studio-artifacts-client";
import {
  StudioActionGrid,
  StudioEmptyState,
  StudioLibraryHeader,
} from "../studio/studio-action-tile";

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
  viewingLookup: boolean;
  onSetViewingLookup: (viewing: boolean) => void;
  onSaveVocabulary: () => void;
  vocabularySaved: boolean;
  onRecordQuizResult: (
    artifactId: string,
    stats: { correctCount: number; totalQuestions: number },
  ) => void;
  onResetQuizResult: (artifactId: string) => void;
  onRetryArtifact: (artifactId: string) => void;
}

function generationErrorMessage(
  errorCode: StudioArtifactErrorCode | undefined,
  t: ReturnType<typeof useTranslations<"Study">>,
): string {
  switch (errorCode) {
    case "NO_QUESTIONS":
      return t("genErrorNoQuestions");
    case "VALIDATION_FAILED":
      return t("genErrorValidation");
    case "TIMEOUT":
      return t("genErrorTimeout");
    case "UPSTREAM_ERROR":
      return t("genErrorUpstream");
    default:
      return t("genErrorGeneric");
  }
}

const artifactMeta: Record<
  StudioArtifactType,
  { icon: typeof HelpCircle; labelKey: string }
> = {
  quiz: { icon: HelpCircle, labelKey: "quiz" },
  flashcard: { icon: Layers, labelKey: "flashcards" },
};

function formatRelativeTime(
  timestamp: string,
  t: ReturnType<typeof useTranslations<"Study">>,
): string {
  const seconds = Math.floor(
    (Date.now() - new Date(timestamp).getTime()) / 1000,
  );
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
  viewingLookup,
  onSetViewingLookup,
  onSaveVocabulary,
  vocabularySaved,
  onRecordQuizResult,
  onResetQuizResult,
  onRetryArtifact,
}: StudyStudioPanelProps) {
  const t = useTranslations("Study");
  const [chatPrefill, setChatPrefill] = useState<string | null>(null);
  // When the slide-in opens, this captures which entry point launched it.
  // The parent only knows "is the overlay open?"; the studio panel knows
  // whether to render the chat or the lookup view inside.
  const [overlayMode, setOverlayMode] = useState<"chat" | "lookup" | null>(
    null,
  );

  const artifacts = artifactsCache.data ?? [];
  const viewingArtifact = viewingArtifactRef
    ? (artifacts.find((r) => r.id === viewingArtifactRef.id) ?? null)
    : null;

  // Esc closes the slide-in overlay
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && (viewingLookup || chatPrefill)) {
        onSetViewingLookup(false);
        setChatPrefill(null);
        setOverlayMode(null);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [viewingLookup, chatPrefill, onSetViewingLookup]);

  // Reset overlay state when the parent closes the overlay.
  // This is intentional: we mirror the parent's open/close into local state
  // so the next time the overlay opens it doesn't carry over the previous mode.
  useEffect(() => {
    if (!viewingLookup) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOverlayMode(null);
      setChatPrefill(null);
    }
  }, [viewingLookup]);

  // Artifact detail view (taken from the library list) — shown in the panel
  if (viewingArtifact) {
    const meta = artifactMeta[viewingArtifact.type] ?? {
      icon: HelpCircle,
      labelKey: viewingArtifact.type,
    };
    const Icon = meta.icon;
    const label = t(meta.labelKey);
    const detail = artifactDetailById[viewingArtifact.id];

    return (
      <Card className="h-full flex flex-col overflow-hidden bg-panel rounded-none">
        <CardContent className="p-0 flex flex-col h-full">
          <PanelHeader
            left={
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onSetViewingArtifact(null)}
                  aria-label={t("backToSources")}
                >
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Icon className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  {t("resultTitle", {
                    type: label,
                    title: viewingArtifact.title,
                  })}
                </h2>
              </>
            }
            onCollapse={onToggleCollapse}
            collapseIcon={<PanelRight className="w-4 h-4" />}
            collapseLabel={t("collapsePanel")}
          />
          <div className="flex-1 overflow-y-auto panel-scroll p-4">
            {viewingArtifact.type === "quiz" && detail?.questions && (
              <QuizContent
                questions={detail.questions}
                passageTitle={viewingArtifact.title}
                artifactId={viewingArtifact.id}
                onReset={() => onSetViewingArtifact(null)}
                onRecordResult={(stats) =>
                  onRecordQuizResult(viewingArtifact.id, stats)
                }
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
      <Card className="h-full flex flex-col overflow-hidden bg-panel rounded-none">
        <CardContent className="p-0 flex flex-col h-full items-center">
          <div className="w-full p-2 flex justify-center border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title={t("expandPanel")}
            >
              <PanelRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Icon-only action chips for the three wired actions */}
          <div className="w-full px-2 py-2 flex flex-col items-center gap-1">
            {[
              {
                id: "quiz" as StudioActionId,
                icon: HelpCircle,
                label: t("quiz"),
              },
              {
                id: "chat" as StudioActionId,
                icon: MessageCircle,
                label: t("chat"),
              },
              {
                id: "lookup" as StudioActionId,
                icon: Languages,
                label: t("translate"),
              },
            ].map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  if (!hasActivePassage) return;
                  if (a.id === "chat") {
                    setChatPrefill(null);
                    setOverlayMode("chat");
                    onSetViewingLookup(true);
                  } else if (a.id === "lookup") {
                    setOverlayMode("lookup");
                    onSetViewingLookup(true);
                  } else {
                    onActionClick(a.id);
                  }
                }}
                disabled={!hasActivePassage}
                title={a.label}
                className={cn(
                  "w-11 h-11 rounded-lg flex items-center justify-center transition-colors",
                  hasActivePassage
                    ? "text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                    : "text-muted-foreground/30 cursor-not-allowed",
                )}
              >
                <a.icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const runningCount = artifacts.filter(
    (r) => r.status === "generating",
  ).length;
  const isActionLocked = (actionId: StudioActionId) => {
    if (actionId === "quiz")
      return artifacts.some(
        (r) => r.status === "generating" && r.type === "quiz",
      );
    return false;
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden bg-panel rounded-none">
      <CardContent className="p-0 flex flex-col h-full">
        <PanelHeader
          left={
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("studio")}
            </h2>
          }
          onCollapse={onToggleCollapse}
          collapseIcon={<PanelRight className="w-4 h-4" />}
          collapseLabel={t("collapsePanel")}
        />

        <StudioActionGrid
          hasActivePassage={hasActivePassage}
          runningCount={runningCount}
          isActionLocked={isActionLocked}
          onSelect={(id) => {
            if (id === "chat") {
              setChatPrefill(null);
              setOverlayMode("chat");
              onSetViewingLookup(true);
            } else if (id === "lookup") {
              setOverlayMode("lookup");
              onSetViewingLookup(true);
            } else {
              onActionClick(id);
            }
          }}
          t={t}
        />

        <StudioLibraryHeader count={artifacts.length} t={t} />

        <div className="flex-1 overflow-y-auto panel-scroll px-3 pb-4">
          {artifacts.length > 0 ? (
            <div className="space-y-1.5">
              {artifacts.map((artifact) => {
                const meta = artifactMeta[artifact.type] ?? {
                  icon: HelpCircle,
                  labelKey: artifact.type,
                };
                const Icon = meta.icon;
                const label = t(meta.labelKey);
                const hasResult =
                  artifact.type === "quiz" && artifact.quizResult;
                const isFailed = artifact.status === "failed";
                const isGenerating = artifact.status === "generating";

                return (
                  <div key={artifact.id} className="group relative">
                    <button
                      type="button"
                      onClick={() =>
                        artifact.status === "done" &&
                        onSetViewingArtifact({
                          type: artifact.type,
                          id: artifact.id,
                        })
                      }
                      disabled={artifact.status !== "done"}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 h-auto text-left rounded-[13px] border bg-surface transition-all",
                        isGenerating &&
                          "border-primary/20 bg-primary/5 cursor-default",
                        artifact.status === "done" &&
                          "border-border hover:border-primary hover:-translate-y-px hover:shadow-card cursor-pointer",
                        isFailed &&
                          "border-destructive/20 bg-destructive/5 opacity-60 cursor-not-allowed",
                      )}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0",
                          isFailed
                            ? "bg-destructive/10 text-destructive"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        {isGenerating ? (
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        ) : (
                          <Icon className="w-4 h-4" strokeWidth={2} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-foreground truncate leading-tight">
                          {t("resultTitle", {
                            type: label,
                            title: artifact.title,
                          })}
                        </p>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="text-[11px] text-muted-foreground truncate">
                            {isGenerating
                              ? t("generating")
                              : isFailed
                                ? generationErrorMessage(artifact.errorCode, t)
                                : formatRelativeTime(
                                    artifact.updatedAt ?? artifact.createdAt,
                                    t,
                                  )}
                          </p>
                          {hasResult && (
                            <span className="text-[11px] font-semibold text-success bg-success-soft px-1.5 py-0.5 rounded shrink-0">
                              {artifact.quizResult!.correctCount}/
                              {artifact.quizResult!.totalQuestions} ·{" "}
                              {Math.round(
                                artifact.quizResult!.accuracyRate * 100,
                              )}
                              %
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          isFailed
                            ? "text-muted-foreground/30"
                            : "text-muted-foreground/50 group-hover:text-primary",
                        )}
                      />
                    </button>

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
                              await resetQuizResult(artifact.id);
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

                    {isFailed && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 bg-surface shadow-sm border border-border"
                          title={t("retry")}
                          disabled={isActionLocked("quiz")}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRetryArtifact(artifact.id);
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
          ) : (
            <StudioEmptyState hasActivePassage={hasActivePassage} t={t} />
          )}
        </div>
      </CardContent>

      {/* 640px slide-in overlay (right → left) for Chat / Lookup — wireframe §1 lines 252-260 */}
      {viewingLookup && activePassage && (
        <StudioOverlay
          title={
            overlayMode === "chat"
              ? t("chatAbout", { title: activePassage.title })
              : translationSelection
                ? `${t("lookup")}: ${translationSelection.selectedText}`
                : t("lookup")
          }
          subtitle={
            overlayMode === "chat"
              ? t("askQuestions")
              : t("vietnameseTranslation")
          }
          icon={overlayMode === "chat" ? MessageCircle : Languages}
          onClose={() => {
            onSetViewingLookup(false);
            setChatPrefill(null);
            setOverlayMode(null);
          }}
          t={t}
        >
          {chatPrefill ? (
            <StudyChatPanel
              key={`${activePassage.id}-${chatPrefill}`}
              passageId={activePassage.id}
              prefilledQuestion={chatPrefill}
            />
          ) : translationSelection ? (
            <StudyLookupPanel
              selection={translationSelection}
              quickTranslation={quickTranslation}
              saved={vocabularySaved}
              onSave={onSaveVocabulary}
              onAskAi={(question) => {
                setChatPrefill(question);
              }}
            />
          ) : (
            <StudioEmptyState hasActivePassage={false} t={t} />
          )}
        </StudioOverlay>
      )}
    </Card>
  );
}

function PanelHeader({
  left,
  onCollapse,
  collapseIcon,
  collapseLabel,
}: {
  left: React.ReactNode;
  onCollapse?: () => void;
  collapseIcon: React.ReactNode;
  collapseLabel: string;
}) {
  return (
    <div className="h-[54px] px-4 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0 flex-1">{left}</div>
      {onCollapse && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onCollapse}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title={collapseLabel}
          aria-label={collapseLabel}
        >
          {collapseIcon}
        </Button>
      )}
    </div>
  );
}

function StudioOverlay({
  title,
  subtitle,
  icon: Icon,
  onClose,
  children,
  t,
}: {
  title: string;
  subtitle: string;
  icon: typeof HelpCircle;
  onClose: () => void;
  children: React.ReactNode;
  t: ReturnType<typeof useTranslations<"Study">>;
}) {
  return (
    <div className="absolute inset-0 z-[60] flex">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-rail/40 backdrop-blur-[2px] studio-scrim-enter"
        aria-hidden
      />
      <div className="ml-auto w-[640px] max-w-[88%] h-full bg-surface border-l border-border shadow-[-24px_0_60px_rgba(0,0,0,0.16)] flex flex-col studio-overlay-enter">
        {/* Header — wireframe §1 lines 257-271 */}
        <div className="h-[60px] shrink-0 px-5 flex items-center gap-3 border-b border-border">
          <div className="w-[38px] h-[38px] rounded-[12px] bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-bold text-foreground truncate">
              {title}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {subtitle}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-[11px] border border-border bg-surface text-ink-2 text-xs font-semibold hover:border-primary hover:text-primary transition-all"
          >
            <X className="w-3.5 h-3.5" />
            {t("allTools")}
          </button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            className="h-[34px] w-[34px] rounded-[11px] text-muted-foreground hover:text-coral hover:border-coral border border-transparent"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
