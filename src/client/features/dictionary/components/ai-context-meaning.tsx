"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { cn } from "@/client/lib/utils";
import { translateQueries } from "../api/queries";
import { PART_OF_SPEECH_LABEL } from "../lib/part-of-speech";
import type { MeaningChoice } from "./meaning-choice";

const AI_KEY = "ai";

interface AiContextMeaningProps {
  word: string;
  context: string;
  isPro: boolean;
  selectedKey: string | null;
  onSelectMeaning: (choice: MeaningChoice) => void;
}

/**
 * The AI meaning of the word in its sentence, only when the user asks for it
 * (Pro). Once shown it can be picked for saving like a dictionary meaning.
 */
export function AiContextMeaning({ word, context, isPro, selectedKey, onSelectMeaning }: AiContextMeaningProps) {
  const [requested, setRequested] = useState(false);
  // A word already translated in this sentence during the session shows at once, without a request.
  const translation = useQuery({ ...translateQueries.inContext(word, context), enabled: isPro && requested });
  const data = translation.data;
  const selected = selectedKey === AI_KEY;

  const header = (
    <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.11em] text-ink-3">
      <Sparkles className="size-3.5 text-coral" aria-hidden />
      Theo ngữ cảnh (AI)
    </p>
  );

  if (!isPro) {
    return (
      <div className="rounded-[12px] border border-border bg-surface p-2.5">
        {header}
        <Button type="button" variant="secondary" size="sm" disabled className="gap-1.5">
          <Lock className="size-3.5" aria-hidden />
          Dịch theo ngữ cảnh
        </Button>
        <p className="mt-1.5 text-[11.5px] text-muted-foreground">Nghĩa theo ngữ cảnh (AI) có trong gói Pro.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-border bg-surface p-2.5">
      {header}
      {data ? (
        <button
          type="button"
          aria-pressed={selected}
          title="Chọn nghĩa này để lưu"
          onClick={() =>
            onSelectMeaning({ key: AI_KEY, term: data.lemma, text: data.translation, partOfSpeech: data.partOfSpeech })
          }
          className={cn(
            "w-full rounded-[9px] px-2 py-1 text-left transition-colors",
            selected ? "bg-indigo-soft ring-1 ring-primary" : "hover:bg-background",
          )}
        >
          <span className="font-serif text-[16px] font-semibold text-primary">{data.translation}</span>
          <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
            {data.lemma} · {PART_OF_SPEECH_LABEL[data.partOfSpeech]}
          </span>
        </button>
      ) : !requested ? (
        <Button type="button" variant="secondary" size="sm" onClick={() => setRequested(true)} className="gap-1.5">
          <Sparkles className="size-3.5" aria-hidden />
          Dịch theo ngữ cảnh
        </Button>
      ) : translation.isError ? (
        <div className="flex items-center gap-2 text-[13px] text-coral">
          Không dịch được theo ngữ cảnh.
          <button
            type="button"
            onClick={() => void translation.refetch()}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            <RotateCcw className="size-3" aria-hidden />
            Thử lại
          </button>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
          Đang dịch...
        </p>
      )}
    </div>
  );
}
