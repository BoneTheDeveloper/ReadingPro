"use client";

import { PanelRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StudioGrid, StudioEmptyState } from "./studio-grid";
import { ArtifactRow } from "./artifact-row";
import type { StudioArtifact } from "@/features/studio-panel/schemas/studio-panel";import type { StudioGridId } from "@/features/studio-panel/schemas/studio-panel";

const GENERATION_ERROR_MESSAGE = "Tạo nội dung thất bại";

interface DefaultStudioViewProps {
  artifacts: StudioArtifact[];
  hasActivePassage: boolean;
  runningCount: number;
  isActionLocked: (actionId: StudioGridId) => boolean;
  onToggleCollapse: () => void;
  onSelectChat: () => void;
  onSelectAction: (actionId: StudioGridId) => void;
  onOpenArtifact: (artifact: StudioArtifact) => void;
  onDeleteArtifact?: (artifactId: string) => void;
}

export function DefaultStudioView({
  artifacts,
  hasActivePassage,
  runningCount,
  isActionLocked,
  onToggleCollapse,
  onSelectChat,
  onSelectAction,
  onOpenArtifact,
  onDeleteArtifact,
}: DefaultStudioViewProps) {
  return (
    <Card className="h-full flex flex-col overflow-hidden bg-panel rounded-none">
      <CardContent className="p-0 flex flex-col h-full">
        <div className="h-[54px] px-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Studio</h2>
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
          runningCount={runningCount}
          isActionLocked={isActionLocked}
          onSelect={(id) => {
            if (id === "chat") onSelectChat();
            else onSelectAction(id);
          }}
        />
        <div className="flex items-center gap-2.5 pt-3 px-4 pb-2">
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="flex-1 overflow-y-auto panel-scroll px-3 pb-4">
          {artifacts.length > 0 ? (
            <div className="space-y-1.5 pt-0.25" >
              {artifacts.map((artifact) => (
                <ArtifactRow
                  key={artifact.id}
                  artifact={artifact}
                  errorMessage={artifact.status === "failed" ? GENERATION_ERROR_MESSAGE : null}
                  onClick={() => onOpenArtifact(artifact)}
                  onDelete={onDeleteArtifact ? () => onDeleteArtifact(artifact.id) : undefined}
                />
              ))}
            </div>
          ) : (
            <StudioEmptyState hasActivePassage={hasActivePassage} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
