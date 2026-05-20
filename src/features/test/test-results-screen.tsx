"use client"

import { Trophy } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface TestResultsScreenProps {
  correctCount: number
  totalQuestions: number
  onReviewReading: () => void
  onNewPassage: () => void
}

export function TestResultsScreen({
  correctCount,
  totalQuestions,
  onReviewReading,
  onNewPassage,
}: TestResultsScreenProps) {
  const accuracy = Math.round((correctCount / totalQuestions) * 100)

  return (
    <div className="min-h-dvh bg-muted flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-gold-soft rounded-full flex items-center justify-center mx-auto mb-6">
          <Trophy className="w-10 h-10 text-gold" />
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">Reading complete</h2>
        <p className="text-muted-foreground mb-8">You&apos;ve answered all questions for this passage.</p>

        <div className="flex justify-center gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-success">{correctCount}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-danger">{totalQuestions - correctCount}</div>
              <div className="text-sm text-muted-foreground">To review</div>
            </CardContent>
          </Card>
        </div>

        <p className="text-lg text-foreground mb-8">
          {accuracy >= 80 ? "Excellent!" : accuracy >= 60 ? "Good job!" : "Keep practicing!"} {accuracy}% accuracy
        </p>

        <div className="flex gap-4">
          <Button variant="outline" onClick={onReviewReading} className="flex-1">Review Reading</Button>
          <Button onClick={onNewPassage} className="flex-1">New Passage</Button>
        </div>
      </div>
    </div>
  )
}
