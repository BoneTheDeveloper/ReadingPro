"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";

function ProcessingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"analyzing" | "generating" | "complete">("analyzing");
  const [progress, setProgress] = useState(0);
  const contentId = searchParams.get("contentId");
  const filename = searchParams.get("filename");

  useEffect(() => {
    const stages = [
      { status: "analyzing" as const, progress: 20 },
      { status: "simplifying" as const, progress: 40 },
      { status: "generating" as const, progress: 70 },
      { status: "complete" as const, progress: 100 },
    ];

    let currentStage = 0;

    const interval = setInterval(() => {
      currentStage++;
      if (currentStage < stages.length) {
        setStatus(stages[currentStage].status === "simplifying" ? "analyzing" : "generating");
        setProgress(stages[currentStage].progress);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          const id = contentId || filename || "demo";
          router.push(`/reading/${encodeURIComponent(id)}`);
        }, 500);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [router, contentId, filename]);

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <RefreshCw className="w-full h-full text-primary animate-spin" />
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          {status === "analyzing" ? "Analyzing text complexity..." : "Generating comprehension questions..."}
        </h2>

        <p className="text-muted-foreground mb-8">
          Our AI is analyzing your content and creating personalized learning materials.
        </p>

        <div className="w-full bg-muted rounded-full h-2 mb-4">
          <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <p className="text-sm text-muted-foreground">{progress}% complete</p>
      </div>
    </div>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-muted flex items-center justify-center p-6">
          <div className="text-center">
            <RefreshCw className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <ProcessingPageContent />
    </Suspense>
  );
}
