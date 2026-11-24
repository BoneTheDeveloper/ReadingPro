"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { Lock, LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
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
  const queryClient = useQueryClient();
  const options = translateQueries.inContext(word, context);
  const translation = useQuery({ ...options, enabled: isPro && requested });
  const data = translation.data;
  const selected = selectedKey === AI_KEY;

  const pick = (d: NonNullable<typeof data>) =>
    onSelectMeaning({ key: AI_KEY, term: d.lemma, text: d.translation, partOfSpeech: d.partOfSpeech });

  // Asking for the context meaning means wanting it: pick it for saving once it arrives.
  const request = () => {
    setRequested(true);
    queryClient.fetchQuery(options).then(pick, () => {});
  };

  // Rendered as the footer row of the context-sentence card: one slim line
  // until there is a result, so it does not push the dictionary down.
  const rowClass = "flex min-h-10 items-center gap-2 border-t border-border px-3 py-1.5 text-[14px]";
  const icon = <Sparkles className="size-4 shrink-0 text-coral" aria-hidden />;

  if (!isPro) {
    return (
      <div className={rowClass}>
        {icon}
        <span className="flex-1 text-muted-foreground">Dịch theo ngữ cảnh bằng AI</span>
        <Link
          to="/pricing"
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-coral px-2.5 py-1 text-[12.5px] font-semibold text-white hover:opacity-90"
        >
          <Lock className="size-3" aria-hidden />
          Nâng cấp Pro
        </Link>
      </div>
    );
  }

  if (data) {
    return (
      <button
        type="button"
        aria-pressed={selected}
        title="Chọn nghĩa này để lưu"
        onClick={() => pick(data)}
        className={cn(
          "flex w-full items-start gap-2 border-t border-border px-3 py-2 text-left transition-colors",
          selected ? "bg-indigo-soft" : "hover:bg-background",
        )}
      >
        <Sparkles className="mt-1 size-4 shrink-0 text-coral" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[18px] font-semibold leading-snug text-primary">{data.translation}</span>
          <span className="block text-[12.5px] text-muted-foreground">
            {data.lemma} · {PART_OF_SPEECH_LABEL[data.partOfSpeech]}
          </span>
        </span>
      </button>
    );
  }

  if (!requested) {
    return (
      <button
        type="button"
        onClick={request}
        className={cn(rowClass, "w-full font-semibold text-primary transition-colors hover:bg-background")}
      >
        {icon}
        Dịch theo ngữ cảnh
      </button>
    );
  }

  return (
    <div className={rowClass}>
      {translation.isError ? (
        <>
          <span className="flex-1 text-coral">Không dịch được theo ngữ cảnh.</span>
          <button
            type="button"
            onClick={() => void translation.refetch()}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            <RotateCcw className="size-3" aria-hidden />
            Thử lại
          </button>
        </>
      ) : (
        <span className="flex items-center gap-2 text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          Đang dịch...
        </span>
      )}
    </div>
  );
}
