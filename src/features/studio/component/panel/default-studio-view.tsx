"use client";

import { PanelRight } from "lucide-react";
import { Card, CardContent } from "@/component/ui/card";
import { Button } from "@/component/ui/button";
import { StudioGrid, StudioEmptyState } from "./studio-grid";
import { ArtifactListItem } from "./artifact-list-item";
import { ARTIFACT_META, type StudioGridId } from "./studio-icon-list";
import { StudioArtifactType } from "@/generated/prisma/enums";
import type { StudioArtifactListItem } from "@/features/studio/schema/artifact";
import type { PendingEntry } from "@/features/studio/hook/use-artifact-pending";

interface DefaultStudioViewProps {
  artifacts: StudioArtifactListItem[];
  pendingEntries: PendingEntry[];
  hasActivePassage: boolean;
  pendingTypes: StudioArtifactType[];
  onToggleCollapse: () => void;
  onSelectChat: () => void;
  onSelectAction: (actionId: StudioGridId) => void;
  onOpenArtifact: (type: StudioGridId, id: string) => void;
  onDeleteArtifact?: (artifactId: string) => void;
}

function artifactSubtitle(
  artifact: StudioArtifactListItem,
): string | null {
  if (artifact.type !== StudioArtifactType.QUESTION) return null;
  if (!artifact.progress) return null;
  const total = artifact.progress.answers.filter((a) => a !== null).length;
  return `${artifact.progress.correctCount}/${total}`;
}

export function DefaultStudioView({
  artifacts,
  pendingEntries,
  hasActivePassage,
  pendingTypes,
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
          onSelect={handleSelect}
        />
        <div className="flex items-center gap-2.5 pt-3 px-4 pb-2">
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="flex-1 overflow-y-auto panel-scroll px-3 pb-4">
          {pendingEntries.length > 0 && (
            <div className="space-y-1.5 pt-0.25">
              {pendingEntries.map((entry) => {
                const isError = entry.status === "error";
                const meta = ARTIFACT_META[StudioArtifactType.QUESTION];
                return (
                  <ArtifactListItem
                    key={entry.submittedAt}
                    title={meta.name}
                    icon={meta.icon}
                    status={isError ? "failed" : "pending"}
                    subtitle={null}
                    errorMessage={isError ? String(entry.error ?? "Lỗi không xác định") : null}
                    onClick={() => {}}
                  />
                );
              })}
            </div>
          )}
          {artifacts.length > 0 ? (
            <div className="space-y-1.5 pt-0.25">
              {artifacts.map((artifact) => {
                const meta = ARTIFACT_META[artifact.type];
                const subtitle = artifactSubtitle(artifact);
                return (
                  <ArtifactListItem
                    key={artifact.id}
                    title={meta.name}
                    icon={meta.icon}
                    status="ready"
                    subtitle={subtitle}
                    onClick={() => onOpenArtifact(artifact.type, artifact.id)}
                    onDelete={onDeleteArtifact ? () => onDeleteArtifact(artifact.id) : undefined}
                  />
                );
              })}
            </div>
          ) : pendingEntries.length === 0 ? (
            <StudioEmptyState hasActivePassage={hasActivePassage} />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
