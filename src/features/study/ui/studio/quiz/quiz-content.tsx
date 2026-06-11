"use client"

import { useState, useCallback, useEffect } from "react"
import { useTranslations } from "next-intl"
import { BookOpen, CheckCircle, XCircle, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/shared/utils"
import { Button } from "@/components/ui/button"
import type { QuestionData } from "@/features/study/model/types"
import { createQuizAttemptForPassage } from "@/features/study/api/study-api"
import { QuizResults } from "./quiz-results"

interface QuizContentProps {
  questions: QuestionData[]
  passageTitle: string
  passageId: string | null
  onReset: () => void
}

export function QuizContent({ questions, passageTitle, passageId, onReset }: QuizContentProps) {
  const t = useTranslations("Study")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const [isComplete, setIsComplete] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)

  const resetTest = useCallback(() => {
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setShowFeedback(false)
    setAnswers({})
    setIsComplete(false)
    setSessionId(null)
    setAttemptId(null)
  }, [])

  const currentQuestion = questions[currentIndex]

  const handleSelectAnswer = useCallback((optionId: string) => {
    if (!showFeedback) setSelectedAnswer(optionId)
  }, [showFeedback])

  const handleCheckAnswer = useCallback(async () => {
    if (!selectedAnswer || !currentQuestion) return

    if (!sessionId && passageId) {
      try {
        const result = await createQuizAttemptForPassage(passageId)
        if (!("error" in result)) {
          setSessionId(result.sessionId)
          setAttemptId(result.attemptId)
        }
      } catch {
        setSessionId(null)
      }
    }

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: isCorrect }))
    setShowFeedback(true)
  }, [selectedAnswer, currentQuestion, sessionId, passageId])

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1)
      setSelectedAnswer(null)
      setShowFeedback(false)
    } else {
      setIsComplete(true)
    }
  }, [currentIndex, questions.length])

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
      setSelectedAnswer(null)
      setShowFeedback(false)
    }
  }, [currentIndex])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentQuestion) return
      if (e.key >= "1" && e.key <= "4" && !showFeedback) {
        const idx = parseInt(e.key) - 1
        if (currentQuestion.options[idx]) handleSelectAnswer(currentQuestion.options[idx].id)
      } else if (e.key === "Enter") {
        if (showFeedback) handleNext()
        else if (selectedAnswer) handleCheckAnswer()
      } else if (e.key === "Backspace" && showFeedback) {
        handlePrevious()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentQuestion, showFeedback, selectedAnswer, handleSelectAnswer, handleCheckAnswer, handleNext, handlePrevious])

  if (questions.length === 0) {
    return (
      <div className="bg-surface rounded-xl shadow-sm border border-border p-6 flex items-center justify-center flex-1 min-h-75">
        <div className="text-center">
          <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-foreground text-base font-medium">{t("noTestYet")}</p>
          <p className="text-muted-foreground text-sm mt-1">{t("generateQuestionsToStart")}</p>
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
        attemptId={attemptId}
        onReset={resetTest}
        onNewPassage={onReset}
      />
    )
  }

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border p-6 flex flex-col relative flex-1">
      <div className="w-full flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-medium text-muted-foreground">
            {currentIndex + 1}/{questions.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              disabled={currentIndex === 0}
              onClick={handlePrevious}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              {t("previous")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              disabled={currentIndex === questions.length - 1 && !showFeedback}
              onClick={handleNext}
            >
              {t("next")}
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <h3 className="text-xl font-bold text-foreground mb-8 text-left leading-snug">{currentQuestion.questionText}</h3>
          <div className="space-y-4">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedAnswer === option.id
              const isCorrect = option.id === currentQuestion.correctAnswer
              const showExplanation =
                showFeedback && (isCorrect || isSelected)
              return (
                <div key={option.id}>
                  <button
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
                    <div className="flex-1 min-w-0">
                      <span className={cn("text-base", !showFeedback && isSelected && "font-semibold text-foreground", !showFeedback && !isSelected && "text-foreground")}>
                        {option.text}
                      </span>
                      {showExplanation && (
                        <p className={cn(
                          "text-sm mt-2 pt-2 border-t",
                          isCorrect ? "text-success/80 border-success/20" : "text-danger/80 border-danger/20",
                        )}>
                          {currentQuestion.explanation}
                        </p>
                      )}
                    </div>
                    {showFeedback && isCorrect && <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />}
                    {showFeedback && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          {!showFeedback ? (
            <Button onClick={handleCheckAnswer} disabled={!selectedAnswer} className={cn("w-full", !selectedAnswer && "bg-muted text-muted-foreground")}>
              {t("checkAnswer")}
            </Button>
          ) : (
            <Button onClick={handleNext} className="w-full">
              {currentIndex < questions.length - 1 ? (
                <>{t("nextQuestion")} <ArrowRight className="w-4 h-4" /></>
              ) : t("viewResults")}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
