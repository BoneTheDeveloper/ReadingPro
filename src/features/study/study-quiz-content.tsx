"use client"

import { useState, useCallback, useEffect } from "react"
import { BookOpen, CheckCircle, XCircle, ArrowRight } from "lucide-react"
import { cn } from "@/lib/shared/utils"
import { Button } from "@/components/ui/button"
import type { QuestionData } from "./study-types"
import { QuizResults } from "./study-quiz-results"

interface QuizContentProps {
  questions: QuestionData[]
  passageTitle: string
  onReset: () => void
}

export function QuizContent({ questions, passageTitle, onReset }: QuizContentProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const [isComplete, setIsComplete] = useState(false)

  const resetTest = useCallback(() => {
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setShowFeedback(false)
    setAnswers({})
    setIsComplete(false)
  }, [])

  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0

  const handleSelectAnswer = useCallback((optionId: string) => {
    if (!showFeedback) setSelectedAnswer(optionId)
  }, [showFeedback])

  const handleCheckAnswer = useCallback(() => {
    if (!selectedAnswer || !currentQuestion) return
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: isCorrect }))
    setShowFeedback(true)
  }, [selectedAnswer, currentQuestion])

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1)
      setSelectedAnswer(null)
      setShowFeedback(false)
    } else {
      setIsComplete(true)
    }
  }, [currentIndex, questions.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentQuestion) return
      if (e.key >= "1" && e.key <= "4" && !showFeedback) {
        const idx = parseInt(e.key) - 1
        if (currentQuestion.options[idx]) handleSelectAnswer(currentQuestion.options[idx].id)
      } else if (e.key === "Enter") {
        if (showFeedback) handleNext()
        else if (selectedAnswer) handleCheckAnswer()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentQuestion, showFeedback, selectedAnswer, handleSelectAnswer, handleCheckAnswer, handleNext])

  if (questions.length === 0) {
    return (
      <div className="bg-surface rounded-xl shadow-sm border border-border p-6 flex items-center justify-center flex-1 min-h-75">
        <div className="text-center">
          <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-foreground text-base font-medium">No test yet</p>
          <p className="text-muted-foreground text-sm mt-1">Generate questions to start testing</p>
        </div>
      </div>
    )
  }

  if (isComplete) {
    const correctCount = Object.values(answers).filter(Boolean).length
    return (
      <QuizResults
        correctCount={correctCount}
        totalQuestions={questions.length}
        passageTitle={passageTitle}
        onReset={resetTest}
        onNewPassage={onReset}
      />
    )
  }

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border p-6 flex flex-col relative overflow-hidden flex-1">
      <div className="w-full flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-semibold text-primary uppercase tracking-[0.02em]">Multiple Choice</span>
          <span className="text-xs font-medium text-muted-foreground">Question {currentIndex + 1}/{questions.length}</span>
        </div>

        <div className="w-full h-1.5 bg-muted rounded-full mb-8">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-bold text-foreground mb-8 text-left leading-snug">{currentQuestion.questionText}</h3>
          <div className="space-y-4">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedAnswer === option.id
              const isCorrect = option.id === currentQuestion.correctAnswer
              return (
                <button
                  key={option.id}
                  onClick={() => handleSelectAnswer(option.id)}
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
                    {option.id}
                  </span>
                  <span className={cn("text-base pt-0.5", !showFeedback && isSelected && "font-semibold text-foreground", !showFeedback && !isSelected && "text-foreground")}>
                    {option.text}
                  </span>
                  {showFeedback && isCorrect && <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />}
                  {showFeedback && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex gap-4">
          {!showFeedback ? (
            <Button onClick={handleCheckAnswer} disabled={!selectedAnswer} className={cn("flex-1", !selectedAnswer && "bg-muted text-muted-foreground")}>
              Check Answer
            </Button>
          ) : (
            <div className="flex-1 space-y-3">
              <div className={cn(
                "p-4 rounded-xl text-sm",
                answers[currentQuestion.id] ? "bg-success-soft/60 border border-success/30" : "bg-danger-soft/60 border border-danger/20",
              )}>
                <div className={cn("flex items-center gap-1.5 mb-1 font-semibold", answers[currentQuestion.id] ? "text-success" : "text-danger")}>
                  {answers[currentQuestion.id] ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  <span>{answers[currentQuestion.id] ? "Correct!" : "Not quite right"}</span>
                </div>
                <p className="text-foreground/80">{currentQuestion.explanation}</p>
              </div>
              <div className="bg-muted border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-0.5 font-medium">Source (Line {currentQuestion.sourceLine}):</p>
                <p className="text-sm text-muted-foreground italic">&ldquo;{currentQuestion.sourceText}&rdquo;</p>
              </div>
              <Button onClick={handleNext} className="w-full">
                {currentIndex < questions.length - 1 ? (
                  <>Next Question <ArrowRight className="w-4 h-4" /></>
                ) : "View Results"}
              </Button>
            </div>
          )}
          <Button variant="outline" size="icon" className="shrink-0 self-start p-4">
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  )
}
