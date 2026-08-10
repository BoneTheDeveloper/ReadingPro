"use client";

import { useCallback, useState } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { StudioDetailView } from "../studio-detail-view";
import { FlashcardContent } from "./flashcard-content";
import { Button } from "@/component/ui/button";
import { useQuery } from "@tanstack/react-query";
import { artifactQueries } from "@/features/studio/api/queries";
import { useUpdateFlashcardProgressMutation } from "@/features/studio/api/mutations";
import type { StudioArtifact } from "@/features/studio/schema/artifact";

interface FlashcardDetailViewProps {
  artifactId: string;
  passageId: string;
  onClose: () => void;
}

type ViewState = "studying" | "finished";

const TOTAL_CARDS = 5;
const DEFAULT_QUEUE: number[] = [0, 1, 2, 3, 4];

function FinishedView({
  totalCards,
  onRetry,
  onClose,
}: {
  totalCards: number;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
      <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-success" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Bạn đã học hết!</h2>
        <p className="text-muted-foreground mt-1">
          Đã hoàn thành {totalCards} thẻ ghi nhớ
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose}>
          Thoát
        </Button>
        <Button onClick={onRetry}>Làm lại</Button>
      </div>
    </div>
  );
}

export function FlashcardDetailView({
  artifactId,
  passageId,
  onClose,
}: FlashcardDetailViewProps) {
  const { data, isLoading, isError, error } = useQuery(
    artifactQueries.detail(artifactId),
  );
  const updateProgress = useUpdateFlashcardProgressMutation();

  const flashcardData =
    data?.type === "FLASHCARD"
      ? (data as Extract<StudioArtifact, { type: "FLASHCARD" }>)
      : undefined;

  // Initialize queue from server progress
  const initialQueue =
    flashcardData?.progress?.queue &&
    flashcardData.progress.queue.length > 0
      ? flashcardData.progress.queue
      : DEFAULT_QUEUE;

  const [viewState, setViewState] = useState<ViewState>("studying");
  const [queue, setQueue] = useState<number[]>(initialQueue);

  // Current card index from front of queue
  const currentCardIndex = queue[0];
  const cardsRemaining = queue.length;

  const handleCardAnswer = useCallback((remembered: boolean) => {
    if (remembered) {
      // Remove card from front (mastered)
      setQueue((prev) => prev.slice(1));
    } else {
      // Move card to back (still needs practice)
      setQueue((prev) => {
        const currentIndex = prev[0];
        return [...prev.slice(1), currentIndex];
      });
    }
  }, []);

  // Queue empty = all cards remembered (Chưa never removes cards)
  const handleQueueEmpty = useCallback(() => {
    updateProgress.mutate({
      artifactId,
      passageId,
      progress: { queue: [] },
    });
    setViewState("finished");
  }, [artifactId, passageId, updateProgress]);

  const handleRetry = useCallback(() => {
    setQueue(DEFAULT_QUEUE);
    updateProgress.mutate({
      artifactId,
      passageId,
      progress: { queue: DEFAULT_QUEUE },
    });
    setViewState("studying");
  }, [artifactId, passageId, updateProgress]);

  if (isLoading) {
    return (
      <StudioDetailView title="Flashcard" onClose={onClose}>
        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-sm">Đang tải...</span>
        </div>
      </StudioDetailView>
    );
  }

  if (isError || !flashcardData) {
    return (
      <StudioDetailView title="Flashcard" onClose={onClose}>
        <div className="flex flex-col items-center justify-center h-full gap-2 text-destructive">
          <span className="text-sm">{error?.message ?? "Không tải được"}</span>
        </div>
      </StudioDetailView>
    );
  }

  // Finished state
  if (viewState === "finished") {
    return (
      <StudioDetailView title="Flashcard" onClose={onClose}>
        <FinishedView
          totalCards={TOTAL_CARDS}
          onRetry={handleRetry}
          onClose={onClose}
        />
      </StudioDetailView>
    );
  }

  // Queue empty → all mastered → finished
  if (cardsRemaining === 0) {
    handleQueueEmpty();
    return (
      <StudioDetailView title="Flashcard" onClose={onClose}>
        <div className="flex flex-col items-center justify-center h-full">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </StudioDetailView>
    );
  }

  // Studying state - keep showing cards from queue
  return (
    <StudioDetailView title="Flashcard" onClose={onClose}>
      <FlashcardContent
        cards={flashcardData.content.cards}
        currentCardIndex={currentCardIndex}
        cardsRemaining={cardsRemaining}
        onAnswer={handleCardAnswer}
      />
    </StudioDetailView>
  );
}
