"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  CheckCircle,
  XCircle,
  ArrowRight,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/shared/classname";

interface TestQuestion {
  id: string;
  number: number;
  questionText: string;
  options: Array<{ id: string; text: string }>;
  correctAnswer: string;
  explanation: string;
  sourceText: string;
  sourceLine: number;
  questionType: string;
  difficulty: number;
}

interface FlashcardTestClientProps {
  passage: {
    id: string;
    title: string;
    content: string;
    originalLevel: string | null;
    wordCount: number;
  };
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

  const passageLines = passage.content
    .split("\n")
    .filter((l) => l.trim().length > 0);

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
    const accuracy = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-primary-600" />
          </div>

          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            Reading Complete!
          </h2>
          <p className="text-neutral-500 mb-8">
            You&apos;ve answered all questions for this passage.
          </p>

          <div className="flex justify-center gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl font-bold text-green-600">
                {correctCount}
              </div>
              <div className="text-sm text-neutral-500">Correct</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl font-bold text-red-500">
                {questions.length - correctCount}
              </div>
              <div className="text-sm text-neutral-500">To Review</div>
            </div>
          </div>

          <p className="text-lg text-neutral-700 mb-8">
            {accuracy >= 80
              ? "Excellent!"
              : accuracy >= 60
                ? "Good job!"
                : "Keep practicing!"}{" "}
            {accuracy}% accuracy
          </p>

          <div className="flex gap-4">
            <button
              onClick={() => router.push(`/reading/${passage.id}`)}
              className="flex-1 px-6 py-3 bg-white border border-neutral-200 rounded-lg font-medium hover:bg-neutral-50"
            >
              Review Reading
            </button>
            <button
              onClick={() => router.push("/upload")}
              className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
            >
              New Passage
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/reading/${passage.id}`)}
              className="p-2 hover:bg-neutral-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-48 bg-neutral-100 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm text-neutral-500">
              {currentIndex + 1} of {questions.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <span className="font-semibold">{streak}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-6 lg:items-start">
          <div className="mb-6 lg:mb-0">
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
                <h2 className="font-semibold text-neutral-900 text-sm">
                  {passage.title}
                </h2>
                <button
                  onClick={() => setShowPassage(!showPassage)}
                  className="text-xs text-primary-600 hover:underline lg:hidden"
                >
                  {showPassage ? "Hide" : "Show"} Passage
                </button>
              </div>
              <div
                className={cn(
                  "p-6 max-h-[400px] overflow-y-auto",
                  "lg:block",
                  showPassage ? "block" : "hidden",
                )}
              >
                {passageLines.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      "relative pl-8 mb-3 text-neutral-700 font-serif",
                      showFeedback &&
                        i + 1 === currentQuestion.sourceLine &&
                        "bg-primary-50 rounded px-2 -mx-2 pl-10",
                    )}
                  >
                    <span className="absolute left-0 top-0 text-xs text-neutral-400 font-sans w-5 text-right">
                      {i + 1}
                    </span>
                    <span
                      className={cn(
                        showFeedback &&
                          i + 1 === currentQuestion.sourceLine &&
                          "bg-gradient-to-t from-primary-100 to-transparent",
                      )}
                    >
                      {line}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-7 h-7 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                {currentQuestion.number}
              </span>
              <span className="text-xs text-neutral-500 uppercase tracking-wide font-medium">
                Multiple Choice
              </span>
            </div>

            <h3 className="text-lg font-semibold text-neutral-900 mb-5 leading-relaxed">
              {currentQuestion.questionText}
            </h3>

            <div className="space-y-3 mb-5">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedAnswer === option.id;
                const isCorrect = option.id === currentQuestion.correctAnswer;

                return (
                  <button
                    key={option.id}
                    onClick={() => handleSelectAnswer(option.id)}
                    disabled={showFeedback}
                    className={cn(
                      "w-full p-4 rounded-xl text-left transition-all border-2 flex items-center gap-3",
                      !showFeedback &&
                        "border-neutral-200 hover:border-primary-300 hover:bg-primary-50",
                      !showFeedback &&
                        isSelected &&
                        "border-primary-500 bg-primary-50",
                      showFeedback &&
                        isCorrect &&
                        "border-green-500 bg-green-50",
                      showFeedback &&
                        isSelected &&
                        !isCorrect &&
                        "border-red-500 bg-red-50",
                      showFeedback &&
                        !isSelected &&
                        !isCorrect &&
                        "border-neutral-200 opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-semibold",
                        !showFeedback && !isSelected && "border-neutral-300",
                        !showFeedback &&
                          isSelected &&
                          "border-primary-500 bg-primary-500 text-white",
                        showFeedback &&
                          isCorrect &&
                          "border-green-500 bg-green-500 text-white",
                        showFeedback &&
                          isSelected &&
                          !isCorrect &&
                          "border-red-500 bg-red-500 text-white",
                      )}
                    >
                      {option.id}
                    </span>
                    <span className="flex-1 text-neutral-700">
                      {option.text}
                    </span>
                    {showFeedback && isCorrect && (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    )}
                    {showFeedback && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {!showFeedback ? (
              <button
                onClick={handleCheckAnswer}
                disabled={!selectedAnswer}
                className={cn(
                  "w-full py-3 rounded-lg font-medium transition-all",
                  selectedAnswer
                    ? "bg-primary-600 text-white hover:bg-primary-700"
                    : "bg-neutral-200 text-neutral-400 cursor-not-allowed",
                )}
              >
                Check Answer
              </button>
            ) : (
              <div className="space-y-4">
                <div
                  className={cn(
                    "p-4 rounded-xl",
                    answers[currentQuestion.id]
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-2 mb-2 font-semibold",
                      answers[currentQuestion.id]
                        ? "text-green-700"
                        : "text-red-700",
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
                  <p className="text-sm text-neutral-700">
                    {currentQuestion.explanation}
                  </p>
                </div>

                <div className="bg-white border border-neutral-200 rounded-lg p-3">
                  <p className="text-xs text-neutral-500 mb-1 font-medium">
                    From the passage (Line {currentQuestion.sourceLine}):
                  </p>
                  <p className="text-sm text-neutral-600 italic font-serif">
                    &ldquo;{currentQuestion.sourceText}&rdquo;
                  </p>
                </div>

                <button
                  onClick={handleNext}
                  className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 flex items-center justify-center gap-2"
                >
                  {currentIndex < questions.length - 1 ? (
                    <>
                      Next Question
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    "View Results"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
