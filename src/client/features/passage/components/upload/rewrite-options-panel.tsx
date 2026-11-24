"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { OptionField, SingleChoice } from "@/client/components/option-chips";
import { optionsFrom } from "@/client/lib/options-from";
import {
  PASSAGE_FIDELITY_LABEL,
  PASSAGE_LENGTH_LABEL,
  PASSAGE_TARGET_LEVEL_LABEL,
  PASSAGE_TONE_LABEL,
  type PassageGenerationOptions,
} from "@/shared/passage/schema";

interface RewriteOptionsPanelProps {
  value: PassageGenerationOptions;
  onChange: (value: PassageGenerationOptions) => void;
}

/** How the AI rewrites the imported source; folded by default, with the current choice in the summary. */
export function RewriteOptionsPanel({ value, onChange }: RewriteOptionsPanelProps) {
  const set = <K extends keyof PassageGenerationOptions>(key: K) => (v: PassageGenerationOptions[K]) =>
    onChange({ ...value, [key]: v });

  const summary = [
    PASSAGE_TARGET_LEVEL_LABEL[value.targetLevel].split(" ·")[0],
    PASSAGE_TONE_LABEL[value.tone],
    PASSAGE_LENGTH_LABEL[value.length].split(" ·")[0],
  ].join(" · ");

  return (
    <details className="group rounded-[12px] border border-border">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-3 text-[14px] [&::-webkit-details-marker]:hidden">
        <SlidersHorizontal className="size-4 text-primary" aria-hidden />
        <span className="font-semibold text-foreground">Tùy chỉnh bài đọc</span>
        <span className="ml-auto truncate text-[13px] text-muted-foreground">{summary}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="space-y-4 border-t border-border px-3.5 py-4">
        <OptionField label="Trình độ">
          <SingleChoice options={optionsFrom(PASSAGE_TARGET_LEVEL_LABEL)} value={value.targetLevel} onChange={set("targetLevel")} />
        </OptionField>
        <OptionField label="Giọng văn">
          <SingleChoice options={optionsFrom(PASSAGE_TONE_LABEL)} value={value.tone} onChange={set("tone")} />
        </OptionField>
        <OptionField label="Độ dài">
          <SingleChoice options={optionsFrom(PASSAGE_LENGTH_LABEL)} value={value.length} onChange={set("length")} />
        </OptionField>
        <OptionField label="Cách viết lại">
          <SingleChoice options={optionsFrom(PASSAGE_FIDELITY_LABEL)} value={value.fidelity} onChange={set("fidelity")} />
        </OptionField>
      </div>
    </details>
  );
}
