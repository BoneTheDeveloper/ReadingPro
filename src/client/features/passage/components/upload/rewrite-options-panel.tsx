"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { OptionField, SingleChoice } from "@/client/components/option-chips";
import { optionsFrom } from "@/client/lib/options-from";
import { useIsPro } from "@/client/features/subscription";
import { MIN_TARGET_WORDS, PLAN_PASSAGE_LIMITS, TARGET_WORDS_STEP } from "@/shared/plan/plans";
import {
  PASSAGE_FIDELITY_LABEL,
  PASSAGE_TARGET_LEVEL_LABEL,
  PASSAGE_TONE_LABEL,
  type PassageGenerationOptions,
} from "@/shared/passage/schema";

interface RewriteOptionsPanelProps {
  value: PassageGenerationOptions;
  onChange: (value: PassageGenerationOptions) => void;
}

/** How the AI rewrites the imported source; folded by default. */
export function RewriteOptionsPanel({ value, onChange }: RewriteOptionsPanelProps) {
  const set = <K extends keyof PassageGenerationOptions>(key: K) => (v: PassageGenerationOptions[K]) =>
    onChange({ ...value, [key]: v });


  return (
    <details className="group rounded-[12px] border border-border">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-3 text-[14px] [&::-webkit-details-marker]:hidden">
        <SlidersHorizontal className="size-4 text-primary" aria-hidden />
        <span className="font-semibold whitespace-nowrap text-foreground">Tùy chỉnh bài đọc</span>
        <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="space-y-4 border-t border-border px-3.5 py-4">
        <OptionField label="Trình độ CEFR">
          <SingleChoice options={optionsFrom(PASSAGE_TARGET_LEVEL_LABEL)} value={value.targetLevel} onChange={set("targetLevel")} />
        </OptionField>
        <OptionField label="Giọng văn">
          <SingleChoice options={optionsFrom(PASSAGE_TONE_LABEL)} value={value.tone} onChange={set("tone")} />
        </OptionField>
        <LengthSlider value={value.targetWords} onChange={set("targetWords")} />
        <OptionField label="Cách viết lại">
          <SingleChoice options={optionsFrom(PASSAGE_FIDELITY_LABEL)} value={value.fidelity} onChange={set("fidelity")} />
        </OptionField>
      </div>
    </details>
  );
}

/** Target length in words; the ceiling follows the plan (the server clamps to it too). */
function LengthSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const isPro = useIsPro();
  const max = PLAN_PASSAGE_LIMITS[isPro ? "PRO" : "FREE"].maxTargetWords;
  const shown = Math.min(value, max);
  const fill = ((shown - MIN_TARGET_WORDS) / (max - MIN_TARGET_WORDS)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="target-words" className="text-[13.5px] font-semibold text-foreground">
          Độ dài
        </label>
        <span className="text-[13.5px] font-semibold tabular-nums text-primary">
          {shown.toLocaleString("vi-VN")} từ
        </span>
      </div>
      <input
        id="target-words"
        type="range"
        min={MIN_TARGET_WORDS}
        max={max}
        step={TARGET_WORDS_STEP}
        value={shown}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${shown} từ`}
        className="h-2 w-full cursor-pointer appearance-none rounded-full accent-primary"
        style={{ background: `linear-gradient(to right, var(--color-primary) ${fill}%, var(--color-muted) ${fill}%)` }}
      />
      <div className="flex justify-between text-[12px] tabular-nums text-muted-foreground">
        <span>{MIN_TARGET_WORDS} từ</span>
        <span>
          {max.toLocaleString("vi-VN")} từ{!isPro && " · Pro tới " + PLAN_PASSAGE_LIMITS.PRO.maxTargetWords.toLocaleString("vi-VN")}
        </span>
      </div>
    </div>
  );
}
