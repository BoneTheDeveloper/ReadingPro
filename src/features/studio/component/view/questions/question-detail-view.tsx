"use client";

import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { StudioDetailView } from "../studio-detail-view";
import { QuestionContent } from "./question-content";
import { QuestionResults } from "./question-results";
import { useQuery } from "@tanstack/react-query";
import { artifactQueries } from "@/features/studio/api/queries";
import { useRecordProgressMutation } from "@/features/studio/api/mutations";
import type { StudioArtifact } from "@/features/studio/schema/artifact";

interface QuestionDetailViewProps {
  artifactId: string;
  passageId: string;
  onClose: () => void;
}

interface Answer {
  selectedIndex: number;
  isCorrect: boolean;
}

export function QuestionDetailView({ artifactId, passageId, onClose }: QuestionDetailViewProps) {
  const { data, isLoading, isError, error } = useQuery(
    artifactQueries.detail(artifactId),
  );
  const recordMutation = useRecordProgressMutation();

  const [isComplete, setIsComplete] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const handleComplete = useCallback((finalAnswers: Answer[]) => {
    const correctCount = finalAnswers.filter((a) => a.isCorrect).length;
    const progress = {
      currentIndex: finalAnswers.length,
      answers: finalAnswers.map((a) => a.selectedIndex),
      correctCount,
      isCompleted: true,
    };
    recordMutation.mutate({ artifactId, passageId, progress });
    setAnswers(finalAnswers);
    setIsComplete(true);
  }, [artifactId, passageId, recordMutation]);

  const handleReset = useCallback(() => {
    setIsComplete(false);
    setAnswers([]);
  }, []);

  if (isLoading) {
    return (
      <StudioDetailView title="Câu hỏi" onClose={onClose}>
        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-sm">Đang tải...</span>
        </div>
      </StudioDetailView>
    );
  }

  if (isError) {
    return (
      <StudioDetailView title="Câu hỏi" onClose={onClose}>
        <div className="flex flex-col items-center justify-center h-full gap-2 text-destructive">
          <span className="text-sm">{error?.message ?? "Không tải được nội dung"}</span>
        </div>
      </StudioDetailView>
    );
  }

  if (!data) {
    return (
      <StudioDetailView title="Câu hỏi" onClose={onClose}>
        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
          <span className="text-sm">Không có dữ liệu</span>
        </div>
      </StudioDetailView>
    );
  }

  if (isComplete) {
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const questionData = data as Extract<StudioArtifact, { type: "QUESTION" }>;
    return (
      <StudioDetailView title="Câu hỏi" onClose={onClose}>
        <QuestionResults
          correctCount={correctCount}
          totalQuestions={questionData.content.questions.length}
          passageTitle=""
          onReset={handleReset}
          onNewPassage={onClose}
        />
      </StudioDetailView>
    );
  }

  const questionData = data as Extract<StudioArtifact, { type: "QUESTION" }>;
  return (
    <StudioDetailView title="Câu hỏi" onClose={onClose}>
      <QuestionContent
        questions={questionData.content.questions}
        passageTitle=""
        onComplete={handleComplete}
      />
    </StudioDetailView>
  );
}
