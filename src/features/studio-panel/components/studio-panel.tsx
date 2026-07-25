"use client";

import { useState, useEffect, useDeferredValue } from "react";
import {
  PanelRight,
  HelpCircle,
  Layers,
  ChevronRight,
  MessageCircle,
  Loader2,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PassageData } from "@/types/passage";
import type {
  ArtifactRef,
  ArtifactDetailCacheEntry,
  StudioArtifactViewType,
  StudioArtifact,
} from "@/features/studio-panel/schemas/studio-artifact";
import type { StudioActionId } from "@/features/studio-panel/server/actions/artifact";
import { QuestionContent } from "./studio/questions/question-content";
import { StudyChatPanel } from "./studio/ai-chat/chat-panel";
import {
  StudioGrid,
  StudioEmptyState,
} from "./studio/studio-action-tile";
import { useGenerationErrorMessage } from "./studio/studio-errors";

type ArtifactQueryStatus = "idle" | "loading" | "success" | "error";

const artifactMeta: Record<StudioArtifactViewType, { icon: typeof HelpCircle; labelVi: string }> = {
  quiz: { icon: HelpCircle, labelVi: "Câu hỏi" },
  flashcard: { icon: Layers, labelVi: "Flashcards" },
  chat: { icon: MessageCircle, labelVi: "Trò chuyện" },
};

export function StudioPanel({
  artifacts,
  status: _status,
  viewingArtifact,
  setViewingArtifact,
  artifactDetailById,
  activePassage,
  hasActivePassage,
  onActionClick,
  collapsed = false,
  onToggleCollapse,
  onRecordQuizResult,
  onResetQuizResult,
  onDeleteArtifact,
  chatPrefill: chatPrefillProp,
  onChatPrefillChange,
}: {
  artifacts: StudioArtifact[];
  status: ArtifactQueryStatus;
  viewingArtifact: ArtifactRef | null;
  setViewingArtifact: (ref: ArtifactRef | null) => void;
  artifactDetailById: Record<string, ArtifactDetailCacheEntry>;
  activePassage: PassageData | null;
  hasActivePassage: boolean;
  onActionClick: (actionId: StudioActionId) => void;
  collapsed?: boolean;
  onToggleCollapse: () => void;
  onRecordQuizResult: (artifactId: string, stats: { correctCount: number; totalQuestions: number }) => void;
  onResetQuizResult: (artifactId: string) => void;
  onDeleteArtifact?: (artifactId: string) => void;
  chatPrefill?: string | null;
  onChatPrefillChange?: (prefill: string | null) => void;
}) {
  const generationErrorMessage = useGenerationErrorMessage();
  const [localChatPrefill, setLocalChatPrefill] = useState<string | null>(null);
  const chatPrefillDeferred = useDeferredValue(chatPrefillProp ?? null);
  const chatPrefill = chatPrefillDeferred ?? localChatPrefill;

  useEffect(() => { onChatPrefillChange?.(chatPrefill); }, [chatPrefill, onChatPrefillChange]);

  const viewingChat = viewingArtifact?.type === "chat";
  const chatPassageId = viewingChat && activePassage ? activePassage.id : null;

  const viewingArtifactData = viewingArtifact
    ? viewingArtifact.type !== "chat"
      ? artifacts.find((a) => a.id === viewingArtifact.id) ?? null
      : null
    : null;

  const runningCount = artifacts.filter((r) => r.status === "generating").length;
  const isActionLocked = (actionId: StudioActionId) => {
    if (actionId === "quiz") return artifacts.some((r) => r.status === "generating" && r.type === "quiz");
    return false;
  };

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && viewingChat) { setViewingArtifact(null); setLocalChatPrefill(null); }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [viewingChat, setViewingArtifact]);

  useEffect(() => {
    if (!viewingChat) setLocalChatPrefill(null);
  }, [viewingChat]);

  if (viewingChat && chatPassageId) {
    return (
      <Card className="h-full flex flex-col overflow-hidden bg-panel rounded-none">
        <CardContent className="p-0 flex flex-col h-full">
          <PanelHeader
            left={
              <button type="button" onClick={() => setViewingArtifact(null)} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span className="hover:underline">Studio</span>
                <ChevronRight className="w-3 h-3" />
                Trò chuyện
              </button>
            }
            onCollapse={onToggleCollapse}
            collapseIcon={<PanelRight className="w-4 h-4" />}
          />
          <div className="flex-1 min-h-0 overflow-hidden">
            <StudyChatPanel key={`${chatPassageId}-${chatPrefill ?? "empty"}`} passageId={chatPassageId} prefilledQuestion={chatPrefill} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (viewingArtifactData) {
    const meta = artifactMeta[viewingArtifactData.type] ?? { icon: HelpCircle, labelVi: viewingArtifactData.type };
    const detail = artifactDetailById[viewingArtifactData.id];

    return (
      <Card className="h-full flex flex-col overflow-hidden bg-panel rounded-none">
        <CardContent className="p-0 flex flex-col h-full">
          <PanelHeader
            left={
              <button type="button" onClick={() => setViewingArtifact(null)} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span className="hover:underline">Studio</span>
                <ChevronRight className="w-3 h-3" />
                {meta.labelVi}
              </button>
            }
            collapseIcon={<PanelRight className="w-4 h-4" />}
          />
          <div className="flex-1 overflow-y-auto panel-scroll relative">
            {viewingArtifactData.type === "quiz" && detail?.questions ? (
              <QuestionContent
                questions={detail.questions}
                passageTitle=""
                artifactId={viewingArtifactData.id}
                onReset={() => setViewingArtifact(null)}
                onRecordResult={(stats) => onRecordQuizResult(viewingArtifactData.id, stats)}
                onResetResult={() => onResetQuizResult(viewingArtifactData.id)}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-sm">Đang tải...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (collapsed) {
    return (
      <Card className="h-full flex flex-col overflow-hidden bg-panel rounded-none">
        <CardContent className="p-0 flex flex-col h-full items-center">
          <div className="w-full p-2 flex justify-center border-b border-border">
            <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <PanelRight className="w-5 h-5" />
            </Button>
          </div>
          <div className="w-full px-2 py-2 flex flex-col items-center gap-1">
            {([
              { id: "quiz" as StudioActionId, icon: HelpCircle, label: "Câu hỏi" },
              { id: "chat" as StudioActionId, icon: MessageCircle, label: "Trò chuyện" },
            ] as const).map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  if (!hasActivePassage) return;
                  if (a.id === "chat") { setLocalChatPrefill(null); setViewingArtifact({ type: "chat", id: "chat" }); }
                  else onActionClick(a.id);
                }}
                disabled={!hasActivePassage}
                title={a.label}
                className={cn(
                  "w-11 h-11 rounded-lg flex items-center justify-center transition-colors",
                  hasActivePassage ? "text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer" : "text-muted-foreground/30 cursor-not-allowed",
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

  return (
    <Card className="h-full flex flex-col overflow-hidden bg-panel rounded-none">
      <CardContent className="p-0 flex flex-col h-full">
        <PanelHeader
          left={<h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Studio</h2>}
          onCollapse={onToggleCollapse}
          collapseIcon={<PanelRight className="w-4 h-4" />}
        />
        <StudioGrid
          hasActivePassage={hasActivePassage}
          runningCount={runningCount}
          isActionLocked={isActionLocked}
          onSelect={(id) => {
            if (id === "chat") { setLocalChatPrefill(null); setViewingArtifact({ type: "chat", id: "chat" }); }
            else onActionClick(id);
          }}
        />
        <div className="flex items-center gap-2.5 pt-5 px-4 pb-2">
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="flex-1 overflow-y-auto panel-scroll px-3 pb-4">
          {artifacts.length > 0 ? (
            <div className="space-y-1.5">
              {artifacts.map((artifact) => {
                const meta = artifactMeta[artifact.type] ?? { icon: HelpCircle, labelVi: artifact.type };
                return (
                  <ArtifactRow
                    key={artifact.id}
                    artifact={artifact}
                    Icon={meta.icon}
                    errorMessage={artifact.status === "failed" ? generationErrorMessage() : null}
                    onClick={() => setViewingArtifact({ type: artifact.type, id: artifact.id })}
                    onDelete={onDeleteArtifact ? () => onDeleteArtifact(artifact.id) : undefined}
                  />
                );
              })}
            </div>
          ) : (
            <StudioEmptyState hasActivePassage={hasActivePassage} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PanelHeader({ left, onCollapse, collapseIcon, collapseLabel }: {
  left: React.ReactNode;
  onCollapse?: () => void;
  collapseIcon?: React.ReactNode;
  collapseLabel?: string;
}) {
  return (
    <div className="h-[54px] px-4 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0 flex-1">{left}</div>
      {onCollapse && (
        <Button variant="ghost" size="icon" onClick={onCollapse} className="h-7 w-7 text-muted-foreground hover:text-foreground" title={collapseLabel} aria-label={collapseLabel}>
          {collapseIcon}
        </Button>
      )}
    </div>
  );
}

function ArtifactRow({
  artifact, Icon, errorMessage, onClick, onDelete,
}: {
  artifact: StudioArtifact;
  Icon: React.ElementType;
  errorMessage?: string | null;
  onClick: () => void;
  onDelete?: () => void;
}) {
  const isGenerating = artifact.status === "generating";
  const isFailed = artifact.status === "failed";
  const hasResult = artifact.type === "quiz" && artifact.quizResult;

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
            {artifact.quizResult!.correctCount}/{artifact.quizResult!.totalQuestions} · {Math.round(artifact.quizResult!.accuracyRate * 100)}%
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
            <button onClick={(e) => e.stopPropagation()} className="shrink-0 p-1 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100" aria-label="Xóa artifact">
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="min-w-40">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive focus:text-destructive font-medium">
              <Trash2 className="w-4 h-4 mr-2" />
              Xóa artifact
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
