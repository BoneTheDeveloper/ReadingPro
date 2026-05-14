"use client";

import { CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/shared/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TestQuestion } from "./test-types";

interface TestQuestionCardProps {
  question: TestQuestion;
  selectedAnswer: string | null;
  showFeedback: boolean;
  isCorrect: boolean;
  isLastQuestion: boolean;
  onSelectAnswer: (optionId: string) => void;
  onCheckAnswer: () => void;
  onNext: () => void;
}

export function TestQuestionCard({
  question,
  selectedAnswer,
  showFeedback,
  isCorrect,
  isLastQuestion,
  onSelectAnswer,
  onCheckAnswer,
  onNext,
}: TestQuestionCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-7 h-7 bg-primary/10 text-primary rounded-full text-sm font-semibold">
            {question.number}
          </span>
          <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Multiple Choice</span>
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-5 leading-relaxed">{question.questionText}</h3>

        <div className="space-y-3 mb-5">
          {question.options.map((option) => (
            <OptionButton
              key={option.id}
              optionId={option.id}
              optionText={option.text}
              isSelected={selectedAnswer === option.id}
              isCorrectOption={option.id === question.correctAnswer}
              showFeedback={showFeedback}
              onSelect={onSelectAnswer}
            />
          ))}
        </div>

        {!showFeedback ? (
          <Button
            onClick={onCheckAnswer}
            disabled={!selectedAnswer}
            className={cn("w-full", !selectedAnswer && "bg-muted text-muted-foreground")}
          >
            Check Answer
          </Button>
        ) : (
          <div className="space-y-4">
            <AnswerFeedback isCorrect={isCorrect} explanation={question.explanation} />
            <SourceReference sourceLine={question.sourceLine} sourceText={question.sourceText} />
            <Button onClick={onNext} className="w-full">
              {isLastQuestion ? "View Results" : (
                <>Next Question <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OptionButton({ optionId, optionText, isSelected, isCorrectOption, showFeedback, onSelect }: {
  optionId: string;
  optionText: string;
  isSelected: boolean;
  isCorrectOption: boolean;
  showFeedback: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(optionId)}
      disabled={showFeedback}
      className={cn(
        "w-full p-4 rounded-xl text-left transition-all border-2 flex items-center gap-3",
        !showFeedback && "border-border hover:border-primary hover:bg-primary/5",
        !showFeedback && isSelected && "border-primary bg-primary/5",
        showFeedback && isCorrectOption && "border-green-500 bg-green-50",
        showFeedback && isSelected && !isCorrectOption && "border-red-500 bg-red-50",
        showFeedback && !isSelected && !isCorrectOption && "border-border opacity-50",
      )}
    >
      <span className={cn(
        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-semibold",
        !showFeedback && !isSelected && "border-border",
        !showFeedback && isSelected && "border-primary bg-primary text-white",
        showFeedback && isCorrectOption && "border-green-500 bg-green-500 text-white",
        showFeedback && isSelected && !isCorrectOption && "border-red-500 bg-red-500 text-white",
      )}>
        {optionId}
      </span>
      <span className="flex-1 text-foreground">{optionText}</span>
      {showFeedback && isCorrectOption && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
      {showFeedback && isSelected && !isCorrectOption && <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
    </button>
  );
}

function AnswerFeedback({ isCorrect, explanation }: { isCorrect: boolean; explanation: string }) {
  const Icon = isCorrect ? CheckCircle : XCircle;
  return (
    <div className={cn("p-4 rounded-xl", isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200")}>
      <div className={cn("flex items-center gap-2 mb-2 font-semibold", isCorrect ? "text-green-700" : "text-red-700")}>
        <Icon className="w-4 h-4" />
        <span>{isCorrect ? "Correct!" : "Not quite right"}</span>
      </div>
      <p className="text-sm text-foreground">{explanation}</p>
    </div>
  );
}

function SourceReference({ sourceLine, sourceText }: { sourceLine: number; sourceText: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground mb-1 font-medium">From the passage (Line {sourceLine}):</p>
        <p className="text-sm text-muted-foreground italic font-serif">&ldquo;{sourceText}&rdquo;</p>
      </CardContent>
    </Card>
  );
}
