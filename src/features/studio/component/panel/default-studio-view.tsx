"use client";

import { PanelRight } from "lucide-react";
import { Card, CardContent } from "@/component/ui/card";
import { Button } from "@/component/ui/button";
import { StudioGrid, StudioEmptyState } from "./studio-grid";
import { ArtifactListItem } from "./artifact-list-item";
import { ARTIFACT_META, type StudioGridId } from "./studio-icon-list";
import { ProcessingStatus, StudioArtifactType } from "@/generated/prisma/enums";
import type { StudioArtifactListItem } from "@/features/studio/schema/artifact";

interface DefaultStudioViewProps {
  artifacts: StudioArtifactListItem[];
  hasActivePassage: boolean;
  pendingTypes: StudioArtifactType[];
  questionPending: boolean;
  flashcardPending: boolean;
  onToggleCollapse: () => void;
  onSelectChat: () => void;
  onSelectAction: (actionId: StudioGridId) => void;
  onOpenArtifact: (type: StudioGridId, id: string) => void;
  onDeleteArtifact?: (artifactId: string) => void;
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

function artifactSubtitle(
  artifact: StudioArtifactListItem,
): string | null {
  if (artifact.type === StudioArtifactType.QUESTION) {
    if (!artifact.progress) return null;
    const total = artifact.progress.answers.filter((a) => a !== null).length;
    return `${artifact.progress.correctCount}/${total}`;
  }
  return null;
}

export function DefaultStudioView({
  artifacts,
  hasActivePassage,
  pendingTypes,
  questionPending,
  flashcardPending,
  onToggleCollapse,
  onSelectChat,
  onSelectAction,
  onOpenArtifact,
  onDeleteArtifact,
}: DefaultStudioViewProps) {

  const handleSelect = (id: StudioGridId) => {
    if (id === "CHAT") onSelectChat();
    else onSelectAction(id);
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden bg-panel rounded-none">
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
          {artifacts.length > 0 ? (
            <div className="space-y-1.5 pt-0.25">
              {artifacts.map((artifact) => {
                const meta = ARTIFACT_META[artifact.type];
                const subtitle = artifactSubtitle(artifact);
                const listStatus = mapProcessingStatus(artifact.status);
                return (
                  <ArtifactListItem
                    key={artifact.id}
                    title={meta.name}
                    icon={meta.icon}
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
          ) : (
            <StudioEmptyState hasActivePassage={hasActivePassage} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
