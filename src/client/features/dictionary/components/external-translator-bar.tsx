"use client";

import { ExternalLink } from "lucide-react";
import { EXTERNAL_TRANSLATORS, openTranslator } from "../lib/external-translators";

/** Buttons that open outside translators for the word, or the sentence, in one popup window. */
export function ExternalTranslatorBar({ word, sentence }: { word: string; sentence: string | null }) {
  const links = EXTERNAL_TRANSLATORS.flatMap((translator) => {
    const url = translator.url(word, sentence);
    return url ? [{ id: translator.id, label: translator.label, url }] : [];
  });

  return (
    <div>
      <p className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.11em] text-ink-3">Tra thêm</p>
      <div className="flex flex-wrap gap-1.5">
        {links.map((link) => (
          <button
            key={link.id}
            type="button"
            onClick={() => openTranslator(link.url)}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[13.5px] font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {link.label}
            <ExternalLink className="size-3" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
