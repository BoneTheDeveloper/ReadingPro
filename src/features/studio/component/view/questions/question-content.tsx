"use client";

import { useState, useCallback, useEffect } from "react";
import {
  BookOpen,
  CheckCircle,
  XCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/component/ui/button";

interface Answer {
  selectedIndex: number;
  isCorrect: boolean;
}

interface QuestionContentProps {
  questions: { text: string; options: string[]; correctIndex: number; sourceText: string; explanation: string }[];
  passageTitle: string;
  onComplete: (answers: Answer[]) => void;
}

export function QuestionContent({
  questions,
  onComplete,
}: QuestionContentProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const currentQuestion = questions[currentIndex];

  const handleSelectAnswer = useCallback(
    (index: number) => {
      if (!showFeedback) setSelectedAnswer(index);
    },
    [showFeedback],
  );

  const handleCheckAnswer = useCallback(() => {
    if (selectedAnswer === null || !currentQuestion) return;
    const newAnswers = [...answers];
    newAnswers[currentIndex] = {
      selectedIndex: selectedAnswer,
      isCorrect: selectedAnswer === currentQuestion.correctIndex,
    };
    setAnswers(newAnswers);
    setShowFeedback(true);
  }, [selectedAnswer, currentQuestion, answers, currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      // Last question — notify parent to handle completion
      const finalAnswers = [...answers];
      if (selectedAnswer !== null) {
        finalAnswers[currentIndex] = {
          selectedIndex: selectedAnswer,
          isCorrect: selectedAnswer === currentQuestion.correctIndex,
        };
      }
      onComplete(finalAnswers);
    }
  }, [currentIndex, questions, answers, selectedAnswer, currentQuestion, onComplete]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    }
  }, [currentIndex]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!currentQuestion) return;
      if (e.key >= "1" && e.key <= "4" && !showFeedback) {
        handleSelectAnswer(parseInt(e.key) - 1);
      } else if (e.key === "Enter") {
        if (showFeedback) handleNext();
        else if (selectedAnswer !== null) handleCheckAnswer();
      } else if (e.key === "Backspace" && showFeedback) handlePrevious();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentQuestion, showFeedback, selectedAnswer, handleSelectAnswer, handleCheckAnswer, handleNext, handlePrevious]);

  if (questions.length === 0) {
    return (
      <div className="bg-surface rounded-xl shadow-sm border border-border p-6 flex items-center justify-center flex-1 min-h-75">
        <div className="text-center">
          <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-foreground text-base font-medium">Chưa có bài kiểm tra</p>
          <p className="text-muted-foreground text-sm mt-1">Tạo câu hỏi để bắt đầu kiểm tra</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border p-6 flex flex-col relative overflow-hidden flex-1">
      <div className="w-full flex flex-col h-full">
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" disabled={currentIndex === 0} onClick={handlePrevious}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-sm font-semibold text-foreground min-w-[3rem] text-center">
              {currentIndex + 1}/{questions.length}
            </span>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" disabled={currentIndex === questions.length - 1 && !showFeedback} onClick={handleNext}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <h3 className="text-xl font-bold text-foreground mb-2 text-left leading-snug">
            {currentQuestion.text}
          </h3>
          <div className="w-full h-1 bg-muted rounded-full mb-6" />
          <div className="space-y-4">
            {currentQuestion.options.map((optionText, idx) => {
              const label = String.fromCharCode(65 + idx);
              const isSelected = selectedAnswer === idx;
              const isCorrect = idx === currentQuestion.correctIndex;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectAnswer(idx)}
                  disabled={showFeedback}
                  className={cn(
                    "w-full p-4 text-left rounded-xl flex items-start gap-4 group transition-all",
                    !showFeedback && "bg-surface border border-border hover:border-primary hover:bg-primary/5",
                    !showFeedback && isSelected && "bg-primary/5 border-2 border-primary",
                    showFeedback && isCorrect && "bg-success-soft/60 border border-success/40",
                    showFeedback && isSelected && !isCorrect && "bg-danger-soft/60 border border-danger/40",
                    showFeedback && !isSelected && !isCorrect && "bg-surface border border-border opacity-50",
                  )}
                >
                  <span className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                    !showFeedback && !isSelected && "border border-border group-hover:border-primary group-hover:text-primary",
                    !showFeedback && isSelected && "bg-primary text-primary-foreground",
                    showFeedback && isCorrect && "bg-success text-primary-foreground",
                    showFeedback && isSelected && !isCorrect && "bg-danger text-primary-foreground",
                  )}>
                    {label}
                  </span>
                  <span className={cn("text-base pt-0.5 flex-1", !showFeedback && isSelected && "font-semibold text-foreground", !showFeedback && !isSelected && "text-foreground")}>
                    {optionText}
                  </span>
                  <span className="w-5 h-5 shrink-0 mt-0.5 flex items-center justify-center">
                    {showFeedback && isCorrect && <CheckCircle className="w-5 h-5 text-success" />}
                    {showFeedback && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-danger" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-3 flex gap-4">
          {!showFeedback ? (
            <Button onClick={handleCheckAnswer} disabled={selectedAnswer === null} className={cn("flex-1", selectedAnswer === null && "bg-muted text-muted-foreground")}>
              Kiểm tra đáp án
            </Button>
          ) : (
            <div className="flex-1 space-y-3">
              <Button onClick={handleNext} className="w-full">
                {currentIndex < questions.length - 1 ? (
                  <>Câu tiếp theo <ArrowRight className="w-4 h-4" /></>
                ) : (
                  "Xem kết quả"
                )}
              </Button>
              <div className={cn("p-4 rounded-xl text-sm", selectedAnswer === currentQuestion.correctIndex ? "bg-success-soft/60 border border-success/30" : "bg-danger-soft/60 border border-danger/20")}>
                <div className={cn("flex items-center gap-1.5 mb-1 font-semibold", selectedAnswer === currentQuestion.correctIndex ? "text-success" : "text-danger")}>
                  {selectedAnswer === currentQuestion.correctIndex ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  <span>{selectedAnswer === currentQuestion.correctIndex ? "Chính xác!" : "Chưa đúng lắm"}</span>
                </div>
                <p className="text-foreground/80">{currentQuestion.explanation}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
