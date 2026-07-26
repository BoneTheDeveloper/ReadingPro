"use client";

import { Loader2, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PanelHeader } from "../panel-header";
import { QuestionContent } from "../questions/question-content";
import { ARTIFACT_META } from "../constants";
import type { StudioArtifact } from "@/features/studio-panel/schemas/studio-artifact";
import type { ArtifactDetailCacheEntry } from "@/features/studio-panel/schemas/studio-artifact";

interface QuestionDetailViewProps {
  artifact: StudioArtifact;
  detail: ArtifactDetailCacheEntry | undefined;
  onClose: () => void;
  onRecordResult: (artifactId: string, stats: { correctCount: number; totalQuestions: number }) => void;
  onResetResult: (artifactId: string) => void;
}

export function QuestionDetailView({ artifact, detail, onClose, onRecordResult, onResetResult }: QuestionDetailViewProps) {
  const meta = ARTIFACT_META[artifact.type];

  return (
    <Card className="h-full flex flex-col overflow-hidden bg-panel rounded-none">
      <CardContent className="p-0 flex flex-col h-full">
        <PanelHeader
          left={
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              <span className="hover:underline">Studio</span>
              <ChevronRight className="w-3 h-3" />
              {meta.label}
            </button>
          }
          collapseLabel="Collapse studio panel"
        />
        <div className="flex-1 overflow-y-auto panel-scroll relative">
          {artifact.type === "question" && detail?.questions ? (
            <QuestionContent
              questions={detail.questions}
              passageTitle=""
              artifactId={artifact.id}
              onReset={onClose}
              onRecordResult={(stats) => onRecordResult(artifact.id, stats)}
              onResetResult={() => onResetResult(artifact.id)}
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
