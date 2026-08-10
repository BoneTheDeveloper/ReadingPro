# Phase 5: UI Components

## Goal
Create flashcard review UI with flip interaction and progress persistence.

## Component Structure

```
component/view/flashcards/
├── flashcard-detail-view.tsx   // Wrapper, handles loading/error
├── flashcard-content.tsx     // Flip card UI
└── flashcard-results.tsx      // Completion screen
```

## Files to Create

### 1. `src/features/studio/component/view/flashcards/flashcard-results.tsx`

Simple completion screen:

```tsx
interface FlashcardResultsProps {
  totalCards: number;
  onRetry: () => void;
  onClose: () => void;
}

export function FlashcardResults({ totalCards, onRetry, onClose }: FlashcardResultsProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
      <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-success" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Hoàn thành!</h2>
        <p className="text-muted-foreground mt-1">
          Đã ôn {totalCards} thẻ ghi nhớ
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose}>
          Đóng
        </Button>
        <Button onClick={onRetry}>
          Ôn lại
        </Button>
      </div>
    </div>
  );
}
```

### 2. `src/features/studio/component/view/flashcards/flashcard-content.tsx`

Flip card UI:

```tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/component/ui/button";
import { cn } from "@/lib/utils";

interface FlashcardContentProps {
  cards: { front: string; back: string }[];
  initialClickCount: number;
  onComplete: (clickCount: number) => void;
  onProgress: (clickCount: number) => void;
}

export function FlashcardContent({
  cards,
  initialClickCount,
  onComplete,
  onProgress,
}: FlashcardContentProps) {
  const [currentIndex, setCurrentIndex] = useState(initialClickCount);
  const [isFlipped, setIsFlipped] = useState(false);
  const [clickCount, setClickCount] = useState(initialClickCount);

  const currentCard = cards[currentIndex];
  const isLastCard = currentIndex === cards.length - 1;

  const handleRemember = useCallback(() => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    onProgress(newCount);

    if (isLastCard) {
      onComplete(newCount);
    } else {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
    }
  }, [clickCount, isLastCard, onComplete, onProgress]);

  // Save progress on natural exit
  useEffect(() => {
    const handleBeforeUnload = () => {
      navigator.sendBeacon(
        `/api/progress`,
        JSON.stringify({ clickCount }),
      );
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [clickCount]);

  if (!currentCard) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      {/* Progress */}
      <div className="text-sm text-muted-foreground">
        {currentIndex + 1} / {cards.length}
      </div>

      {/* Card */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full max-w-md h-64 cursor-pointer perspective-1000"
      >
        <div
          className={cn(
            "relative w-full h-full transition-transform duration-300 transform-style-preserve-3d",
            isFlipped && "rotate-y-180"
          )}
        >
          {/* Front */}
          <div className="absolute inset-0 bg-card rounded-xl border p-6 flex items-center justify-center text-center backface-hidden">
            <p className="text-lg font-medium">{currentCard.front}</p>
          </div>

          {/* Back */}
          <div className="absolute inset-0 bg-primary/10 rounded-xl border p-6 flex items-center justify-center text-center rotate-y-180 backface-hidden">
            <p className="text-lg">{currentCard.back}</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">Nhấn để lật</p>

      {/* Action */}
      <Button
        onClick={handleRemember}
        className="w-full max-w-md"
        disabled={!isFlipped}
      >
        Nhớ rồi
      </Button>
    </div>
  );
}
```

### 3. `src/features/studio/component/view/flashcards/flashcard-detail-view.tsx`

Wrapper with loading/error states:

```tsx
"use client";

import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { StudioDetailView } from "../studio-detail-view";
import { FlashcardContent } from "./flashcard-content";
import { FlashcardResults } from "./flashcard-results";
import { useQuery } from "@tanstack/react-query";
import { artifactQueries } from "@/features/studio/api/queries";
import { useUpdateFlashcardProgressMutation } from "@/features/studio/api/mutations";

interface FlashcardDetailViewProps {
  artifactId: string;
  passageId: string;
  onClose: () => void;
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

  const [isComplete, setIsComplete] = useState(
    data?.progress?.isCompleted ?? false,
  );

  const handleComplete = useCallback(
    (clickCount: number) => {
      const progress = { clickCount, isCompleted: true };
      updateProgress.mutate({ artifactId, passageId, progress });
      setIsComplete(true);
    },
    [artifactId, passageId, updateProgress],
  );

  const handleProgress = useCallback(
    (clickCount: number) => {
      updateProgress.mutate({
        artifactId,
        passageId,
        progress: { clickCount, isCompleted: clickCount >= 5 },
      });
    },
    [artifactId, passageId, updateProgress],
  );

  const handleRetry = useCallback(() => {
    setIsComplete(false);
    // Reset progress
    updateProgress.mutate({
      artifactId,
      passageId,
      progress: { clickCount: 0, isCompleted: false },
    });
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

  if (isError) {
    return (
      <StudioDetailView title="Flashcard" onClose={onClose}>
        <div className="flex flex-col items-center justify-center h-full gap-2 text-destructive">
          <span className="text-sm">{error?.message ?? "Không tải được"}</span>
        </div>
      </StudioDetailView>
    );
  }

  if (isComplete || !data) {
    return (
      <StudioDetailView title="Flashcard" onClose={onClose}>
        <FlashcardResults
          totalCards={data?.content.cards.length ?? 5}
          onRetry={handleRetry}
          onClose={onClose}
        />
      </StudioDetailView>
    );
  }

  return (
    <StudioDetailView title="Flashcard" onClose={onClose}>
      <FlashcardContent
        cards={data.content.cards}
        initialClickCount={data.progress?.clickCount ?? 0}
        onComplete={handleComplete}
        onProgress={handleProgress}
      />
    </StudioDetailView>
  );
}
```

### 4. Create index

```ts
// src/features/studio/component/view/flashcards/index.ts
export { FlashcardDetailView } from "./flashcard-detail-view";
```

## Update `src/features/studio/component/panel/studio-panel.tsx`

```tsx
import { FlashcardDetailView } from "../view/flashcards/flashcard-detail-view";
import { useGenerateFlashcardMutation } from "../../api/mutations";

// Add to handleGenerate:
if (actionId === StudioArtifactType.FLASHCARD) {
  generateFlashcard.mutate(passageId);
}

// Add contentType case:
if (view?.contentType === "flashcard") {
  return (
    <FlashcardDetailView
      artifactId={view.artifactId}
      passageId={passageId ?? ""}
      onClose={closeView}
    />
  );
}
```

## Add CSS (or use existing Tailwind)

```css
/* Add to global.css or component */
.perspective-1000 { perspective: 1000px; }
.backface-hidden { backface-visibility: hidden; }
.rotate-y-180 { transform: rotateY(180deg); }
.transform-style-preserve-3d { transform-style: preserve-3d; }
```

## Validation

Manual testing:
1. Generate flashcards
2. Open flashcard artifact
3. Flip card
4. Click "Nhớ rồi"
5. Complete all cards
6. Refresh — progress persists
7. Retry button works

## Criteria

- [ ] `FlashcardDetailView` handles loading/error states
- [ ] `FlashcardContent` flips and progresses
- [ ] `FlashcardResults` shows completion with retry
- [ ] Progress saves on each click
- [ ] `beforeunload` saves progress
- [ ] `studio-panel.tsx` routes to flashcard view
