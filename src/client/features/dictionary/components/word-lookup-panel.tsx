"use client";

import { useState } from "react";
import { useIsPro } from "@/client/features/subscription";
import { cn } from "@/client/lib/utils";
import { PartOfSpeech } from "@/shared/enums";
import type { MatchedDictionaryEntry } from "@/shared/dictionary/schema";
import { AiContextMeaning } from "./ai-context-meaning";
import { DictionaryEntryView } from "./dictionary-entry-view";
import { ExternalTranslatorBar } from "./external-translator-bar";
import { SaveMeaningForm } from "./save-meaning-form";
import type { MeaningChoice } from "./meaning-choice";

interface WordLookupPanelProps {
  passageId: string;
  selectedText: string;
  context: string | null;
  /** The word's own entry and/or its base form; empty when the dictionary has neither. */
  entries: MatchedDictionaryEntry[];
}

/**
 * The body of the "Tra từ" view. The context meaning comes first because it is
 * the best answer for a word read in a sentence; dictionary entries follow as
 * tabs so the word and its base form never stack into one long scroll; the
 * save bar stays docked at the bottom and saves whichever meaning is picked.
 */
export function WordLookupPanel({ passageId, selectedText, context, entries }: WordLookupPanelProps) {
  const isPro = useIsPro();
  const [choice, setChoice] = useState<MeaningChoice | null>(null);
  const [activeEntry, setActiveEntry] = useState(0);
  const entry = entries[Math.min(activeEntry, entries.length - 1)];
  const first = entries[0];
  const firstPartOfSpeech = first?.senses.find((s) => s.kind === "word")?.partOfSpeech ?? PartOfSpeech.OTHER;

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1 space-y-4 p-4">
        {/* The sentence and its AI meaning share one card; the AI part is one row until used. */}
        {context && (
          <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
            <blockquote className="px-3 py-2.5 font-serif text-[15.5px] italic leading-snug text-ink-3">“{context}”</blockquote>
            <AiContextMeaning
              word={selectedText}
              context={context}
              isPro={isPro}
              selectedKey={choice?.key ?? null}
              onSelectMeaning={setChoice}
            />
          </div>
        )}

        {entry ? (
          <div className="space-y-3">
            {entries.length > 1 && (
              <div role="tablist" aria-label="Mục từ điển" className="flex gap-1 rounded-[10px] bg-muted p-1">
                {entries.map((e, i) => (
                  <button
                    key={e.headword}
                    type="button"
                    role="tab"
                    aria-selected={e === entry}
                    onClick={() => setActiveEntry(i)}
                    className={cn(
                      "flex-1 rounded-[7px] px-2 py-1.5 text-[14px] font-semibold transition-colors",
                      e === entry ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {e.displayHeadword}
                    <span className="ml-1 font-normal text-muted-foreground">
                      {e.match === "lemma" ? "· dạng gốc" : "· từ đã chọn"}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <DictionaryEntryView
              key={entry.headword}
              entry={entry}
              selectedText={selectedText}
              context={context}
              selectedKey={choice?.key ?? null}
              onSelectMeaning={setChoice}
            />
          </div>
        ) : (
          <div>
            <p className="font-serif text-[26px] font-semibold text-foreground">{selectedText}</p>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Không có trong từ điển. Hãy thử các trang tra từ bên dưới.
            </p>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <ExternalTranslatorBar word={first?.displayHeadword ?? selectedText} sentence={context} />
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-panel p-3">
        <SaveMeaningForm
          key={choice?.key ?? "none"}
          choice={choice}
          defaultTerm={first?.displayHeadword ?? selectedText.toLowerCase()}
          defaultPartOfSpeech={firstPartOfSpeech}
          contextSentence={context}
          passageId={passageId}
        />
      </div>
    </div>
  );
}
