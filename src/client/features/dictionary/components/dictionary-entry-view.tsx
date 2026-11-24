"use client";

import { useState } from "react";
import { cn } from "@/client/lib/utils";
import type { DictionarySense, MatchedDictionaryEntry } from "@/shared/dictionary/schema";
import { findContextIdiom } from "../lib/context-match";
import { PART_OF_SPEECH_LABEL } from "../lib/part-of-speech";
import type { MeaningChoice } from "./meaning-choice";

const VISIBLE_MEANINGS = 3;
/** Parts of speech shown open; the rest fold away so a long entry stays short. */
const VISIBLE_WORD_SENSES = 2;

interface DictionaryEntryViewProps {
  entry: MatchedDictionaryEntry;
  selectedText: string;
  context: string | null;
  selectedKey: string | null;
  onSelectMeaning: (choice: MeaningChoice) => void;
}

/**
 * One dictionary entry: the general groups first, the idiom the sentence uses
 * on top of them, then the other idioms and the specialist fields folded away.
 */
export function DictionaryEntryView({
  entry,
  selectedText,
  context,
  selectedKey,
  onSelectMeaning,
}: DictionaryEntryViewProps) {
  const contextIdiom = findContextIdiom(entry, selectedText, context);
  const words = entry.senses.filter((s) => s.kind === "word");
  const idioms = entry.senses.filter((s) => s.kind === "idiom" && s !== contextIdiom);
  const domains = entry.senses.filter((s) => s.kind === "domain");

  const block = (sense: DictionarySense, index: number, badge?: string) => (
    <SenseBlock
      key={`${sense.kind}-${index}-${sense.label}`}
      sense={sense}
      term={entry.displayHeadword}
      keyPrefix={`${entry.headword}|${sense.kind}|${index}`}
      badge={badge}
      selectedKey={selectedKey}
      onSelectMeaning={onSelectMeaning}
    />
  );

  return (
    <section className="space-y-3">
      <header>
        <h3 className="font-serif text-[26px] font-semibold leading-tight text-foreground">
          {entry.displayHeadword}
        </h3>
        {entry.phonetic && <p className="mt-0.5 text-[14px] text-muted-foreground">/{entry.phonetic}/</p>}
      </header>

      {contextIdiom && block(contextIdiom, -1, "Theo câu")}
      {words.slice(0, VISIBLE_WORD_SENSES).map((sense, i) => block(sense, i))}
      {words.length > VISIBLE_WORD_SENSES && (
        <Fold title={`Loại từ khác (${words.length - VISIBLE_WORD_SENSES})`}>
          {words.slice(VISIBLE_WORD_SENSES).map((sense, i) => block(sense, i + VISIBLE_WORD_SENSES))}
        </Fold>
      )}

      {idioms.length > 0 && (
        <Fold title={`Thành ngữ & cụm từ (${idioms.length})`}>{idioms.map((sense, i) => block(sense, i))}</Fold>
      )}
      {domains.length > 0 && (
        <Fold title={`Chuyên ngành (${domains.length})`}>{domains.map((sense, i) => block(sense, i))}</Fold>
      )}
    </section>
  );
}

function Fold({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-[12px] border border-border">
      <summary className="cursor-pointer select-none px-3 py-2 text-[13.5px] font-semibold text-ink-3 hover:text-primary">
        {title}
      </summary>
      <div className="space-y-3 px-3 pb-3">{children}</div>
    </details>
  );
}

interface SenseBlockProps {
  sense: DictionarySense;
  term: string;
  keyPrefix: string;
  badge?: string;
  selectedKey: string | null;
  onSelectMeaning: (choice: MeaningChoice) => void;
}

function SenseBlock({ sense, term, keyPrefix, badge, selectedKey, onSelectMeaning }: SenseBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const hidden = sense.meanings.length - VISIBLE_MEANINGS;
  const meanings = expanded ? sense.meanings : sense.meanings.slice(0, VISIBLE_MEANINGS);
  // Domain groups are specialist fields, not parts of speech.
  const posLabel = sense.kind === "word" && sense.partOfSpeech !== "OTHER" ? PART_OF_SPEECH_LABEL[sense.partOfSpeech] : null;
  // The source label only adds something when it says more than the badge, e.g. "nội động từ ran, run".
  const label = sense.label.toLowerCase() === posLabel ? "" : sense.label;

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        {badge && (
          <span className="rounded-full bg-primary px-2 py-[2px] text-[11px] font-bold uppercase tracking-[0.07em] text-primary-foreground">
            {badge}
          </span>
        )}
        {label && (
          <span
            className={cn(
              "text-[13.5px] text-ink-3",
              sense.kind === "idiom" ? "font-serif text-[15.5px] font-semibold text-foreground" : "italic",
            )}
          >
            {label}
          </span>
        )}
        {posLabel && (
          <span className="rounded-full border border-border bg-muted px-2 py-[2px] text-[11px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
            {posLabel}
          </span>
        )}
      </div>

      <ol className="space-y-0.5">
        {meanings.map((meaning, i) => {
          const key = `${keyPrefix}|${i}`;
          const selected = key === selectedKey;
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onSelectMeaning({ key, term, text: meaning.text, partOfSpeech: sense.partOfSpeech })}
                aria-pressed={selected}
                title="Chọn nghĩa này để lưu"
                className={cn(
                  "w-full rounded-[9px] px-2 py-1 text-left text-[15px] leading-snug transition-colors",
                  selected ? "bg-indigo-soft text-foreground ring-1 ring-primary" : "hover:bg-surface",
                )}
              >
                {meaning.text}
              </button>
              {meaning.examples.length > 0 && (
                <details className="ml-2 mt-0.5">
                  <summary className="cursor-pointer select-none text-[12px] text-muted-foreground hover:text-primary">
                    Ví dụ ({meaning.examples.length})
                  </summary>
                  <ul className="mt-1 space-y-1 border-l border-border pl-2.5">
                    {meaning.examples.map((example, j) => (
                      <li key={j} className="text-[14px] leading-snug">
                        <span className="italic text-foreground">{example.en}</span>
                        {example.vi && <span className="block text-muted-foreground">{example.vi}</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
      </ol>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="ml-2 mt-1 text-[12.5px] font-semibold text-primary hover:underline"
        >
          {expanded ? "Thu gọn" : `Xem thêm (${hidden})`}
        </button>
      )}
    </div>
  );
}
