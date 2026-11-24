"use client";

import { useCallback, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { StudioDetailView } from "../studio-detail-view";
import { FlashcardContent } from "./flashcard-content";
import { Button } from "@/client/components/ui/button";
import { cn } from "@/client/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { artifactQueries } from "../../../api/queries";
import { useRecordProgressMutation } from "../../../api/mutations";
import type { FlashcardProgress, StudioArtifact } from "@/shared/studio/artifact";
import { StudioArtifactType } from "@/shared/enums";
import { getErrorMessage } from "@/client/lib/api/error-message";

interface FlashcardDetailViewProps {
  artifactId: string;
  passageId: string;
  onClose: () => void;
}

type FlashcardArtifact = Extract<StudioArtifact, { type: "FLASHCARD" }>;
type Card = FlashcardArtifact["content"]["cards"][number];

const freshProgress = (count: number): FlashcardProgress => ({
  queue: Array.from({ length: count }, (_, i) => i),
  missCounts: Array(count).fill(0),
  isCompleted: false,
});

export function FlashcardDetailView({ artifactId, passageId, onClose }: FlashcardDetailViewProps) {
  const { data, isLoading, isError, error } = useQuery(artifactQueries.detail(artifactId));

  let body: React.ReactNode;
  if (isLoading) {
    body = (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-sm">Đang tải...</span>
      </div>
    );
  } else if (isError || data?.type !== StudioArtifactType.FLASHCARD) {
    body = (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-destructive">
        <span className="text-sm">{isError ? getErrorMessage(error) : "Không có dữ liệu"}</span>
      </div>
    );
  } else {
    body = <FlashcardSession artifact={data} passageId={passageId} onClose={onClose} />;
  }

  return (
    <StudioDetailView title="Flashcard" onClose={onClose}>
      {body}
    </StudioDetailView>
  );
}

function FlashcardSession({
  artifact,
  passageId,
  onClose,
}: {
  artifact: FlashcardArtifact;
  passageId: string;
  onClose: () => void;
}) {
  const { cards } = artifact.content;
  const updateProgress = useRecordProgressMutation();

  const [progress, setProgress] = useState<FlashcardProgress>(() => {
    const saved = artifact.progress;
    if (!saved) return freshProgress(cards.length);
    // Rows saved before isCompleted existed mark completion with an empty queue.
    const isCompleted = saved.isCompleted || saved.queue.length === 0;
    return {
      queue: saved.queue.filter((i) => i < cards.length),
      missCounts: cards.map((_, i) => saved.missCounts[i] ?? 0),
      isCompleted,
    };
  });
  const [turn, setTurn] = useState(0);

  const save = useCallback(
    (next: FlashcardProgress) => {
      setProgress(next);
      updateProgress.mutate({
        artifactId: artifact.id,
        passageId,
        type: StudioArtifactType.FLASHCARD,
        progress: next,
      });
    },
    [artifact.id, passageId, updateProgress],
  );

  const handleAnswer = useCallback(
    (remembered: boolean) => {
      const [current, ...rest] = progress.queue;
      const missCounts = [...progress.missCounts];
      if (!remembered) missCounts[current] += 1;
      const queue = remembered ? rest : [...rest, current];
      save({ queue, missCounts, isCompleted: queue.length === 0 });
      setTurn((t) => t + 1);
    },
    [progress, save],
  );

  const handleRetry = useCallback(() => {
    save(freshProgress(cards.length));
    setTurn((t) => t + 1);
  }, [cards.length, save]);

  if (progress.isCompleted || progress.queue.length === 0) {
    return <FlashcardResults cards={cards} missCounts={progress.missCounts} onRetry={handleRetry} onClose={onClose} />;
  }

  return (
    <FlashcardContent
      key={turn}
      card={cards[progress.queue[0]]}
      masteredCount={cards.length - new Set(progress.queue).size}
      totalCards={cards.length}
      remaining={progress.queue.length}
      onAnswer={handleAnswer}
    />
  );
}

function FlashcardResults({
  cards,
  missCounts,
  onRetry,
  onClose,
}: {
  cards: Card[];
  missCounts: number[];
  onRetry: () => void;
  onClose: () => void;
}) {
  const firstTry = missCounts.filter((m) => m === 0).length;
  const reviewed = cards.length - firstTry;

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-5 pt-6 pb-5 border-b border-border">
        <p className="text-xs uppercase tracking-[0.11em] text-muted-foreground font-medium">Kết quả</p>
        <p className="mt-1 text-2xl font-bold text-foreground">Đã nhớ hết {cards.length} thẻ</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border border-border px-3 py-2">
            <div className="text-xl font-bold text-success tabular-nums">{firstTry}</div>
            <div className="text-xs text-muted-foreground">Nhớ ngay lần đầu</div>
          </div>
          <div className="rounded-lg border border-border px-3 py-2">
            <div className="text-xl font-bold text-gold tabular-nums">{reviewed}</div>
            <div className="text-xs text-muted-foreground">Cần ôn lại</div>
          </div>
        </div>
      </div>

      <ul className="flex-1 divide-y divide-border">
        {cards.map((card, i) => {
          const misses = missCounts[i] ?? 0;
          return (
            <li key={i} className="px-5 py-3 flex items-start gap-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{card.front}</p>
                <p className="text-muted-foreground mt-0.5">{card.back}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                  misses === 0 ? "bg-success-soft text-success" : "bg-gold-soft text-gold",
                )}
              >
                {misses === 0 ? "Lần đầu" : `Quên ${misses} lần`}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-0 border-t border-border bg-panel px-5 py-3 flex gap-2">
        <Button variant="outline" onClick={onRetry} className="flex-1">
          <RotateCcw className="w-4 h-4" /> Học lại
        </Button>
        <Button onClick={onClose} className="flex-1">
          Quay lại
        </Button>
      </div>
    </div>
  );
}
