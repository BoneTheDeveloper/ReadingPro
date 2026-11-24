"use client";

import { useState, useCallback, useEffect } from "react";
import { CheckCircle, XCircle, ArrowRight, Lightbulb, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/client/lib/utils";
import { Button } from "@/client/components/ui/button";
import type { QuestionContent as QuestionContentData } from "@/shared/studio/artifact";
import { QUESTION_FORMAT_LABEL, QuestionFormat } from "@/shared/studio/generation-options";

type QuestionItem = QuestionContentData["questions"][number];

interface QuestionContentProps {
  questions: QuestionItem[];
  /** Selected option per question; null means not answered yet. */
  answers: (number | null)[];
  initialIndex: number;
  onAnswer: (questionIndex: number, selectedIndex: number) => void;
  onFinish: () => void;
}

export function QuestionContent({
  questions,
  answers,
  initialIndex,
  onAnswer,
  onFinish,
}: QuestionContentProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [selected, setSelected] = useState<number | null>(null);

  const question = questions[currentIndex];
  const committed = answers[currentIndex] ?? null;
  const showFeedback = committed !== null;
  const shownSelection = showFeedback ? committed : selected;
  const isLast = currentIndex === questions.length - 1;
  const answeredCount = answers.filter((a) => a !== null).length;
  const allAnswered = answeredCount === questions.length;

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= questions.length) return;
      setCurrentIndex(index);
      setSelected(null);
    },
    [questions.length],
  );

  const handleCheck = useCallback(() => {
    if (selected === null || showFeedback) return;
    onAnswer(currentIndex, selected);
  }, [selected, showFeedback, onAnswer, currentIndex]);

  const handleNext = useCallback(() => {
    if (!isLast) {
      goTo(currentIndex + 1);
      return;
    }
    if (allAnswered) onFinish();
    else goTo(answers.findIndex((a) => a === null));
  }, [isLast, allAnswered, goTo, currentIndex, onFinish, answers]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const pick = Number(e.key) - 1;
      if (pick >= 0 && pick < question.options.length && !showFeedback) setSelected(pick);
      else if (e.key === "Enter") {
        if (showFeedback) handleNext();
        else handleCheck();
      } else if (e.key === "ArrowLeft") goTo(currentIndex - 1);
      else if (e.key === "ArrowRight") goTo(currentIndex + 1);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showFeedback, handleNext, handleCheck, goTo, currentIndex, question.options.length]);

  const isCorrectAnswer = committed === question.correctIndex;

  return (
    <div className="flex flex-col min-h-full">
      {/* Progress: one segment per question, colored by result */}
      <div className="px-5 pt-4 pb-3 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">
            Câu {currentIndex + 1}
            <span className="text-muted-foreground font-medium"> / {questions.length}</span>
          </span>
          <span className="text-muted-foreground">Đã trả lời {answeredCount}/{questions.length}</span>
        </div>
        <div className="flex gap-1" role="tablist" aria-label="Tiến trình câu hỏi">
          {questions.map((q, i) => {
            const a = answers[i];
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === currentIndex}
                aria-label={`Câu ${i + 1}${a === null || a === undefined ? "" : a === q.correctIndex ? ", đúng" : ", sai"}`}
                onClick={() => goTo(i)}
                className="flex-1 py-1.5 group focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-colors",
                    a === null || a === undefined
                      ? "bg-muted group-hover:bg-border-strong"
                      : a === q.correctIndex
                        ? "bg-success"
                        : "bg-danger",
                    i === currentIndex && "ring-2 ring-primary/40 ring-offset-1 ring-offset-panel",
                    "group-focus-visible:ring-2 group-focus-visible:ring-ring",
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5">
        <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
          {QUESTION_FORMAT_LABEL[question.format]}
        </p>
        <h3 className="text-lg font-semibold text-foreground leading-snug mb-4">
          {question.format === QuestionFormat.FILL_BLANK ? (
            <BlankSentence
              text={question.text}
              filled={showFeedback ? question.options[question.correctIndex] : selected !== null ? question.options[selected] : null}
              revealed={showFeedback}
            />
          ) : (
            question.text
          )}
        </h3>
        <div className="space-y-2" role="radiogroup" aria-label="Các đáp án">
          {question.options.map((optionText, idx) => {
            const label = String.fromCharCode(65 + idx);
            const isSelected = shownSelection === idx;
            const isCorrect = idx === question.correctIndex;
            return (
              <button
                key={idx}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => !showFeedback && setSelected(idx)}
                disabled={showFeedback}
                className={cn(
                  "w-full px-3.5 py-3 text-left rounded-lg border flex items-center gap-3 transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !showFeedback && !isSelected && "border-border bg-surface/60 hover:border-primary/50 hover:bg-surface",
                  !showFeedback && isSelected && "border-primary bg-primary/5",
                  showFeedback && isCorrect && "border-success/50 bg-success-soft/50",
                  showFeedback && isSelected && !isCorrect && "border-danger/50 bg-danger-soft/50",
                  showFeedback && !isSelected && !isCorrect && "border-border opacity-55",
                )}
              >
                <span
                  className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 border",
                    !showFeedback && !isSelected && "border-border text-muted-foreground",
                    !showFeedback && isSelected && "border-primary bg-primary text-primary-foreground",
                    showFeedback && isCorrect && "border-success bg-success text-primary-foreground",
                    showFeedback && isSelected && !isCorrect && "border-danger bg-danger text-primary-foreground",
                    showFeedback && !isSelected && !isCorrect && "border-border text-muted-foreground",
                  )}
                >
                  {label}
                </span>
                <span className={cn("text-sm flex-1 text-foreground", isSelected && "font-medium")}>{optionText}</span>
                {showFeedback && isCorrect && <CheckCircle className="w-4.5 h-4.5 text-success shrink-0" />}
                {showFeedback && isSelected && !isCorrect && <XCircle className="w-4.5 h-4.5 text-danger shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions sit right under the options; the explanation renders below them
          so revealing it never moves the button. */}
      <div className="px-5 pt-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Câu trước"
          disabled={currentIndex === 0}
          onClick={() => goTo(currentIndex - 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {showFeedback ? (
          <Button onClick={handleNext} className="flex-1">
            {!isLast ? (
              <>Câu tiếp theo <ArrowRight className="w-4 h-4" /></>
            ) : allAnswered ? (
              "Xem kết quả"
            ) : (
              "Câu chưa trả lời"
            )}
          </Button>
        ) : (
          <Button onClick={handleCheck} disabled={selected === null} className="flex-1">
            Kiểm tra đáp án
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Câu sau"
          disabled={isLast}
          onClick={() => goTo(currentIndex + 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {showFeedback && (
        <section
          role="status"
          aria-label="Giải thích đáp án"
          className="mx-5 mt-4 mb-5 rounded-md border border-border bg-surface overflow-hidden"
        >
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold",
              isCorrectAnswer ? "bg-success-soft/60 text-success" : "bg-danger-soft/60 text-danger",
            )}
          >
            {isCorrectAnswer ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
            <span>{isCorrectAnswer ? "Chính xác!" : "Chưa đúng"}</span>
          </div>
          <div className="px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
              <Lightbulb className="w-3.5 h-3.5" aria-hidden />
              Giải thích
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">{question.explanation}</p>
          </div>
        </section>
      )}
    </div>
  );
}

/** A fill-in-the-blank sentence: the gap shows the picked word, or the right one once checked. */
function BlankSentence({ text, filled, revealed }: { text: string; filled: string | null; revealed: boolean }) {
  const [before, ...rest] = text.split(/_{2,}/);
  if (rest.length === 0) return <>{text}</>;
  return (
    <>
      {before}
      <span
        className={cn(
          "mx-0.5 inline-block min-w-[4.5rem] border-b-2 px-1 text-center",
          revealed ? "border-success text-success" : filled ? "border-primary text-primary" : "border-border-strong text-transparent",
        )}
      >
        {filled ?? "____"}
      </span>
      {rest.join("____")}
    </>
  );
}
