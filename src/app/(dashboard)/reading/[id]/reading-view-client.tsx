"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, FileText, ChevronLeft, Play } from "lucide-react";
import { cn } from "@/lib/shared/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { calculateReadingTime } from "@/lib/shared/reading-utils";
import { getCEFRColor, getCEFRLabel } from "@/lib/shared/cefr-utils";

interface PassageData {
  id: string;
  title: string;
  content: string;
  simplifiedContent: string | null;
  originalLevel: string | null;
  simplifiedLevel: string | null;
  wordCount: number;
  displayContent: string;
  displayLevel: string;
  questionCount: number;
}

interface ReadingViewClientProps {
  passage: PassageData;
}

type ViewMode = "original" | "simplified";

export function ReadingViewClient({ passage }: ReadingViewClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>(
    passage.simplifiedContent ? "simplified" : "original",
  );

  const currentContent =
    viewMode === "simplified" && passage.simplifiedContent
      ? passage.simplifiedContent
      : passage.content;

  const currentLevel =
    viewMode === "simplified" ? passage.simplifiedLevel : passage.originalLevel;

  const level = (currentLevel || passage.displayLevel) as Parameters<typeof getCEFRColor>[0];
  const readingTime = calculateReadingTime(passage.wordCount, passage.displayLevel);

  return (
    <div className="min-h-screen bg-muted">
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold text-foreground truncate max-w-[200px]">{passage.title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className={cn("px-3 py-1 rounded-full text-sm font-semibold", getCEFRColor(level))}>
              {getCEFRLabel(level)}
            </span>
            {passage.questionCount > 0 && (
              <Button onClick={() => router.push(`/test/${passage.id}`)} size="sm">
                <Play className="w-4 h-4" />
                <span className="hidden sm:inline">Start Test</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Card>
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">{passage.title}</h2>

            <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b border-border text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{readingTime}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>{passage.wordCount} words</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", getCEFRColor(level))}>
                  Level {level}
                </span>
              </div>
            </div>

            {passage.simplifiedContent && (
              <div className="flex items-center gap-2 mb-6 p-1 bg-muted rounded-lg">
                <Button
                  variant={viewMode === "original" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("original")}
                >
                  Original ({passage.originalLevel})
                </Button>
                <Button
                  variant={viewMode === "simplified" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("simplified")}
                >
                  Simplified ({passage.simplifiedLevel})
                </Button>
              </div>
            )}

            <div className="font-serif text-lg leading-loose text-foreground">
              {currentContent.split("\n\n").map((paragraph, i) => (
                <p key={i} className="mb-5 last:mb-0">{paragraph}</p>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {passage.questionCount} comprehension question{passage.questionCount !== 1 ? "s" : ""} available
              </div>
              {passage.questionCount > 0 && (
                <Button onClick={() => router.push(`/test/${passage.id}`)}>
                  Take the Test
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
