"use client";

import { useState, useCallback, useEffect } from "react";
import {
  BookOpen,
  CheckCircle,
  XCircle,
  ArrowRight,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/shared/utils";
import type { QuestionData } from "./study-types";

interface QuizContentProps {
  questions: QuestionData[];
  passageTitle: string;
  onReset: () => void;
}

export function QuizContent({
  questions,
  passageTitle,
  onReset,
}: QuizContentProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [streak, setStreak] = useState(0);

  const resetTest = useCallback(() => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setAnswers({});
    setIsComplete(false);
    setStreak(0);
  }, []);

  const currentQuestion = questions[currentIndex];
  const progress =
    questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const handleSelectAnswer = useCallback(
    (optionId: string) => {
      if (!showFeedback) setSelectedAnswer(optionId);
    },
    [showFeedback],
  );

  const handleCheckAnswer = useCallback(() => {
    if (!selectedAnswer || !currentQuestion) return;
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: isCorrect }));
    setShowFeedback(true);
    setStreak((s) => (isCorrect ? s + 1 : 0));
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
      if (!currentQuestion) return;
      if (e.key >= "1" && e.key <= "4" && !showFeedback) {
        const idx = parseInt(e.key) - 1;
        if (currentQuestion.options[idx])
          handleSelectAnswer(currentQuestion.options[idx].id);
      } else if (e.key === "Enter") {
        if (showFeedback) handleNext();
        else if (selectedAnswer) handleCheckAnswer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentQuestion,
    showFeedback,
    selectedAnswer,
    handleSelectAnswer,
    handleCheckAnswer,
    handleNext,
  ]);

  // Empty state
  if (questions.length === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-outline-variant/20 p-6 flex items-center justify-center flex-1 min-h-75">
        <div className="text-center">
          <div className="w-14 h-14 bg-accent rounded-xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-on-surface-variant" />
          </div>
          <p className="text-on-surface-variant text-[16px] font-medium">
            No test yet
          </p>
          <p className="text-on-surface-variant/60 text-[14px] mt-1">
            Generate questions to start testing
          </p>
        </div>
      </div>
    );
  }

  // Complete state
  if (isComplete) {
    const correctCount = Object.values(answers).filter(Boolean).length;
    const accuracy = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-outline-variant/20 p-6 flex items-center justify-center flex-1 min-h-75">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-[24px] font-semibold text-on-surface mb-1">
            Test Complete!
          </h2>
          <p className="text-[14px] text-on-surface-variant mb-8">
            {passageTitle}
          </p>

          <div className="flex justify-center gap-4 mb-8">
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] min-w-25">
              <div className="text-[28px] font-bold text-green-600">
                {correctCount}
              </div>
              <div className="text-[12px] text-on-surface-variant font-medium">
                Correct
              </div>
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] min-w-25">
              <div className="text-[28px] font-bold text-destructive">
                {questions.length - correctCount}
              </div>
              <div className="text-[12px] text-on-surface-variant font-medium">
                Wrong
              </div>
            </div>
          </div>

          <p className="text-on-surface text-[16px] mb-8">
            {accuracy >= 80
              ? "Excellent!"
              : accuracy >= 60
                ? "Good job!"
                : "Keep practicing!"}{" "}
            {accuracy}%
          </p>

          <div className="flex gap-4">
            <button
              onClick={resetTest}
              className="flex-1 py-4 border border-outline-variant rounded-xl text-[14px] font-semibold text-on-surface hover:bg-surface-container-highest transition-all"
            >
              Try Again
            </button>
            <button
              onClick={onReset}
              className="flex-1 py-4 bg-primary text-on-primary rounded-xl text-[14px] font-semibold hover:opacity-90 transition-all"
            >
              New Passage
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Test state
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] border border-outline-variant/20 p-6 flex flex-col relative overflow-hidden flex-1">
      <div className="w-full flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-[12px] font-semibold text-primary uppercase tracking-[0.02em]">
            Multiple Choice
          </span>
          <span className="text-[12px] font-medium text-on-surface-variant">
            Question {currentIndex + 1}/{questions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-surface-container-highest rounded-full mb-8">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question */}
        <div className="flex-1">
          <h3 className="text-[20px] font-bold text-on-surface mb-8 text-left leading-snug">
            {currentQuestion.questionText}
          </h3>
          <div className="space-y-4">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedAnswer === option.id;
              const isCorrect = option.id === currentQuestion.correctAnswer;
              return (
                <button
                  key={option.id}
                  onClick={() => handleSelectAnswer(option.id)}
                  disabled={showFeedback}
                  className={cn(
                    "w-full p-4 text-left rounded-xl flex items-start gap-4 group transition-all",
                    !showFeedback &&
                      "bg-surface-container-lowest border border-outline-variant hover:border-primary hover:bg-primary/5",
                    !showFeedback &&
                      isSelected &&
                      "bg-primary/5 border-2 border-primary",
                    showFeedback &&
                      isCorrect &&
                      "bg-green-50/60 border border-green-400/50",
                    showFeedback &&
                      isSelected &&
                      !isCorrect &&
                      "bg-red-50/60 border border-destructive/40",
                    showFeedback &&
                      !isSelected &&
                      !isCorrect &&
                      "bg-surface-container-lowest border border-outline-variant/50 opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0 transition-all",
                      !showFeedback &&
                        !isSelected &&
                        "border border-outline-variant group-hover:border-primary group-hover:text-primary",
                      !showFeedback &&
                        isSelected &&
                        "bg-primary text-on-primary",
                      showFeedback && isCorrect && "bg-green-500 text-white",
                      showFeedback &&
                        isSelected &&
                        !isCorrect &&
                        "bg-destructive text-white",
                    )}
                  >
                    {option.id}
                  </span>
                  <span
                    className={cn(
                      "text-[16px] pt-0.5",
                      !showFeedback &&
                        isSelected &&
                        "font-semibold text-on-surface",
                      !showFeedback && !isSelected && "text-on-surface",
                      showFeedback &&
                        (isCorrect || (isSelected && !isCorrect)) &&
                        "text-on-surface",
                    )}
                  >
                    {option.text}
                  </span>
                  {showFeedback && isCorrect && (
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  )}
                  {showFeedback && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-8 pt-6 border-t border-outline-variant/30 flex gap-4">
          {!showFeedback ? (
            <button
              onClick={handleCheckAnswer}
              disabled={!selectedAnswer}
              className={cn(
                "flex-1 py-4 rounded-xl text-[14px] font-semibold transition-all",
                selectedAnswer
                  ? "bg-primary text-on-primary hover:opacity-90"
                  : "bg-surface-container-highest text-on-surface-variant cursor-not-allowed",
              )}
            >
              Check Answer
            </button>
          ) : (
            <div className="flex-1 space-y-3">
              <div
                className={cn(
                  "p-4 rounded-xl text-[14px]",
                  answers[currentQuestion.id]
                    ? "bg-green-50/60 border border-green-200/50"
                    : "bg-red-50/60 border border-destructive/20",
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-1.5 mb-1 font-semibold",
                    answers[currentQuestion.id]
                      ? "text-green-700"
                      : "text-destructive",
                  )}
                >
                  {answers[currentQuestion.id] ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span>
                    {answers[currentQuestion.id]
                      ? "Correct!"
                      : "Not quite right"}
                  </span>
                </div>
                <p className="text-on-surface/80">
                  {currentQuestion.explanation}
                </p>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-3">
                <p className="text-[12px] text-on-surface-variant mb-0.5 font-medium">
                  Source (Line {currentQuestion.sourceLine}):
                </p>
                <p className="text-[14px] text-on-surface-variant italic">
                  &ldquo;{currentQuestion.sourceText}&rdquo;
                </p>
              </div>
              <button
                onClick={handleNext}
                className="w-full py-4 bg-primary text-on-primary rounded-xl text-[14px] font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
              >
                {currentIndex < questions.length - 1 ? (
                  <>
                    Next Question <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  "View Results"
                )}
              </button>
            </div>
          )}
          <button className="p-4 border border-outline-variant rounded-xl hover:bg-surface-container-highest transition-all shrink-0 self-start">
            <ArrowRight className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>
      </div>
    </div>
  );
}
