"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TestHeader } from "@/components/test/test-header";
import { TestPassagePanel } from "@/components/test/test-passage-panel";
import { TestQuestionCard } from "@/components/test/test-question-card";
import { TestResultsScreen } from "@/components/test/test-results-screen";
import type { TestQuestion, TestPassage } from "@/components/test/test-types";

interface FlashcardTestClientProps {
  passage: TestPassage;
  questions: TestQuestion[];
}

export function FlashcardTestClient({
  passage,
  questions,
}: FlashcardTestClientProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [streak, setStreak] = useState(0);
  const [showPassage, setShowPassage] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleSelectAnswer = useCallback(
    (optionId: string) => {
      if (!showFeedback) {
        setSelectedAnswer(optionId);
      }
    },
    [showFeedback],
  );

  const handleCheckAnswer = useCallback(() => {
    if (!selectedAnswer) return;

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: isCorrect }));
    setShowFeedback(true);

    if (isCorrect) {
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
  }, [selectedAnswer, currentQuestion]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      setIsComplete(true);
    }
  }, [currentIndex, questions.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "4" && !showFeedback) {
        const idx = parseInt(e.key) - 1;
        if (currentQuestion.options[idx]) {
          handleSelectAnswer(currentQuestion.options[idx].id);
        }
      } else if (e.key === "Enter") {
        if (showFeedback) {
          handleNext();
        } else if (selectedAnswer) {
          handleCheckAnswer();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    showFeedback,
    selectedAnswer,
    currentQuestion,
    handleSelectAnswer,
    handleCheckAnswer,
    handleNext,
  ]);

  if (isComplete) {
    const correctCount = Object.values(answers).filter(Boolean).length;

    return (
      <TestResultsScreen
        correctCount={correctCount}
        totalQuestions={questions.length}
        onReviewReading={() => router.push(`/reading/${passage.id}`)}
        onNewPassage={() => router.push("/upload")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <TestHeader
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        progress={progress}
        streak={streak}
        onBack={() => router.push(`/reading/${passage.id}`)}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-6 lg:items-start">
          <TestPassagePanel
            title={passage.title}
            content={passage.content}
            showPassage={showPassage}
            showFeedback={showFeedback}
            highlightedLine={currentQuestion.sourceLine}
            onTogglePassage={() => setShowPassage((p) => !p)}
          />

          <TestQuestionCard
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            showFeedback={showFeedback}
            isCorrect={answers[currentQuestion.id] ?? false}
            isLastQuestion={currentIndex === questions.length - 1}
            onSelectAnswer={handleSelectAnswer}
            onCheckAnswer={handleCheckAnswer}
            onNext={handleNext}
          />
        </div>
      </main>
    </div>
  );
}
