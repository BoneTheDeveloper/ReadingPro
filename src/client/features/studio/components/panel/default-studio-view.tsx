"use client";

import { DIFFICULTY_LABEL } from "@/shared/studio/generation-options";
import { PanelRight } from "lucide-react";
import { Card, CardContent } from "@/client/components/ui/card";
import { Button } from "@/client/components/ui/button";
import { StudioGrid, StudioEmptyState } from "./studio-grid";
import { ArtifactListItem } from "./artifact-list-item";
import { ARTIFACT_META, LOOKUP_META, type StudioGridId } from "./studio-icon-list";
import { ProcessingStatus, StudioArtifactType } from "@/shared/enums";
import type { StudioArtifactListItem } from "@/shared/studio/artifact";
import type { WordLookup } from "@/shared/dictionary/schema";

interface DefaultStudioViewProps {
  artifacts: StudioArtifactListItem[];
  lookups: WordLookup[];
  hasActivePassage: boolean;
  pendingTypes: StudioArtifactType[];
  questionPending: boolean;
  flashcardPending: boolean;
  onToggleCollapse: () => void;
  onSelectChat: () => void;
  onSelectLookup: () => void;
  onSelectAction: (actionId: StudioGridId) => void;
  onOpenArtifact: (type: StudioGridId, id: string) => void;
  onDeleteArtifact?: (artifactId: string) => void;
  onOpenLookup: (lookupId: string) => void;
  onDeleteLookup?: (lookupId: string) => void;
}

// Exhaustive on purpose: a new ProcessingStatus must be a compile error here,
// not a tile that silently spins forever.
function mapProcessingStatus(status: ProcessingStatus): "ready" | "pending" | "failed" {
  switch (status) {
    case ProcessingStatus.COMPLETED:
      return "ready";
    case ProcessingStatus.FAILED:
      return "failed";
    case ProcessingStatus.PENDING:
      return "pending";
  }
}

/** Progress first (what the learner did), then what the set is: "Đang làm 2/10 · 10 câu · Khó". */
function artifactSubtitle(artifact: StudioArtifactListItem): string | null {
  const parts: string[] = [];

  if (artifact.type === StudioArtifactType.QUESTION) {
    const p = artifact.progress;
    if (p?.isCompleted) parts.push(`Đúng ${p.correctCount}/${p.answers.length}`);
    else {
      const answered = p?.answers.filter((a) => a !== null).length ?? 0;
      if (answered) parts.push(`Đang làm ${answered}/${p!.answers.length}`);
    }
    if (artifact.itemCount) parts.push(`${artifact.itemCount} câu`);
  } else {
    const p = artifact.progress;
    const total = artifact.itemCount ?? p?.missCounts.length ?? 0;
    if (p && (p.isCompleted || p.queue.length === 0)) parts.push("Đã nhớ hết");
    else if (p && total) parts.push(`Đã nhớ ${total - new Set(p.queue).size}/${total}`);
    if (artifact.itemCount) parts.push(`${artifact.itemCount} thẻ`);
  }

  if (artifact.difficulty) parts.push(DIFFICULTY_LABEL[artifact.difficulty]);
  return parts.length ? parts.join(" · ") : null;
}

export function DefaultStudioView({
  artifacts,
  lookups,
  hasActivePassage,
  pendingTypes,
  questionPending,
  flashcardPending,
  onToggleCollapse,
  onSelectChat,
  onSelectLookup,
  onSelectAction,
  onOpenArtifact,
  onDeleteArtifact,
  onOpenLookup,
  onDeleteLookup,
}: DefaultStudioViewProps) {

  const handleSelect = (id: StudioGridId) => {
    if (id === "CHAT") onSelectChat();
    else if (id === "LOOKUP") onSelectLookup();
    else onSelectAction(id);
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden bg-background rounded-none py-0 gap-0 ring-0 shadow-none">
      <CardContent className="p-0 flex flex-col h-full">
        <div className="h-[54px] px-4 flex items-center justify-between border-b border-border">
          <h2 className="text-[11px] font-bold text-ink-3 uppercase tracking-[0.13em]">Studio</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label="Collapse studio panel"
          >
            <PanelRight className="w-4 h-4" />
          </Button>
        </div>
        <StudioGrid
          hasActivePassage={hasActivePassage}
          pendingTypes={pendingTypes}
          questionPending={questionPending}
          flashcardPending={flashcardPending}
          onSelect={handleSelect}
        />
        <div className="flex items-center gap-2.5 pt-3 px-4 pb-2">
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="flex-1 overflow-y-auto panel-scroll px-3 pb-4">
          {artifacts.length > 0 && (
            <div className="space-y-0.5 pt-0.25">
              {artifacts.map((artifact) => {
                const meta = ARTIFACT_META[artifact.type];
                const subtitle = artifactSubtitle(artifact);
                const listStatus = mapProcessingStatus(artifact.status);
                return (
                  <ArtifactListItem
                    key={artifact.id}
                    title={meta.name}
                    icon={meta.icon}
                    tone={meta.tone}
                    status={listStatus}
                    subtitle={subtitle}
                    onClick={() => {
                      if (artifact.status === "COMPLETED") {
                        onOpenArtifact(artifact.type, artifact.id);
                      }
                    }}
                    onDelete={
                      onDeleteArtifact
                        ? () => onDeleteArtifact(artifact.id)
                        : undefined
                    }
                  />
                );
              })}
            </div>
          )}
          {lookups.length > 0 && (
            <section aria-label="Từ đã tra" className="pt-3">
              <h3 className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.11em] text-ink-3">
                Từ đã tra ({lookups.length})
              </h3>
              <div className="space-y-0.5">
                {lookups.map((lookup) => (
                  <ArtifactListItem
                    key={lookup.id}
                    title={lookup.headword}
                    icon={LOOKUP_META.icon}
                    tone={LOOKUP_META.tone}
                    status="ready"
                    subtitle={lookup.summary}
                    subtitleMuted
                    deleteLabel="Xóa khỏi danh sách"
                    onClick={() => onOpenLookup(lookup.id)}
                    onDelete={onDeleteLookup ? () => onDeleteLookup(lookup.id) : undefined}
                  />
                ))}
              </div>
            </section>
          )}
          {artifacts.length === 0 && lookups.length === 0 && (
            <StudioEmptyState hasActivePassage={hasActivePassage} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
