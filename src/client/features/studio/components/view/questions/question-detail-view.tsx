"use client";

import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { StudioDetailView } from "../studio-detail-view";
import { QuestionContent } from "./question-content";
import { QuestionResults } from "./question-results";
import { useQuery } from "@tanstack/react-query";
import { artifactQueries } from "../../../api/queries";
import { useRecordProgressMutation } from "../../../api/mutations";
import type { QuestionProgress, StudioArtifact } from "@/shared/studio/artifact";
import { StudioArtifactType } from "@/shared/enums";
import { getErrorMessage } from "@/client/lib/api/error-message";

interface QuestionDetailViewProps {
  artifactId: string;
  passageId: string;
  onClose: () => void;
}

type QuestionArtifact = Extract<StudioArtifact, { type: "QUESTION" }>;

export function QuestionDetailView({ artifactId, passageId, onClose }: QuestionDetailViewProps) {
  const { data, isLoading, isError, error } = useQuery(artifactQueries.detail(artifactId));

  let body: React.ReactNode;
  if (isLoading) {
    body = (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-sm">Đang tải...</span>
      </div>
    );
  } else if (isError || data?.type !== StudioArtifactType.QUESTION) {
    body = (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-destructive">
        <span className="text-sm">{isError ? getErrorMessage(error) : "Không có dữ liệu"}</span>
      </div>
    );
  } else {
    body = <QuestionSession artifact={data} passageId={passageId} onClose={onClose} />;
  }

  return (
    <StudioDetailView title="Câu hỏi" onClose={onClose}>
      {body}
    </StudioDetailView>
  );
}

/** Mounted only once data is loaded, so saved progress seeds the state. */
function QuestionSession({
  artifact,
  passageId,
  onClose,
}: {
  artifact: QuestionArtifact;
  passageId: string;
  onClose: () => void;
}) {
  const { questions } = artifact.content;
  const recordMutation = useRecordProgressMutation();

  const [progress, setProgress] = useState<QuestionProgress>(() => {
    const saved = artifact.progress;
    const answers = questions.map((_, i) => saved?.answers[i] ?? null);
    return {
      currentIndex: Math.min(saved?.currentIndex ?? 0, questions.length - 1),
      answers,
      correctCount: countCorrect(questions, answers),
      isCompleted: saved?.isCompleted ?? false,
    };
  });
  // Bumped on reset so the quiz remounts at question 1.
  const [attempt, setAttempt] = useState(0);

  const save = useCallback(
    (next: QuestionProgress) => {
      setProgress(next);
      recordMutation.mutate({
        artifactId: artifact.id,
        passageId,
        type: StudioArtifactType.QUESTION,
        progress: next,
      });
    },
    [artifact.id, passageId, recordMutation],
  );

  const handleAnswer = useCallback(
    (questionIndex: number, selectedIndex: number) => {
      const answers = [...progress.answers];
      answers[questionIndex] = selectedIndex;
      save({
        currentIndex: questionIndex,
        answers,
        correctCount: countCorrect(questions, answers),
        isCompleted: false,
      });
    },
    [progress.answers, questions, save],
  );

  const handleFinish = useCallback(() => save({ ...progress, isCompleted: true }), [progress, save]);

  const handleReset = useCallback(() => {
    save({ currentIndex: 0, answers: questions.map(() => null), correctCount: 0, isCompleted: false });
    setAttempt((n) => n + 1);
  }, [questions, save]);

  if (progress.isCompleted) {
    return (
      <QuestionResults questions={questions} answers={progress.answers} onReset={handleReset} onClose={onClose} />
    );
  }

  return (
    <QuestionContent
      key={attempt}
      questions={questions}
      answers={progress.answers}
      initialIndex={progress.currentIndex}
      onAnswer={handleAnswer}
      onFinish={handleFinish}
    />
  );
}

function countCorrect(questions: QuestionArtifact["content"]["questions"], answers: (number | null)[]) {
  return questions.filter((q, i) => answers[i] === q.correctIndex).length;
}
