import type { DictionaryEntry, DictionarySense } from "@/shared/dictionary/schema";

const MAX_PARTICLES = 3;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Up to three lowercased words right after the first occurrence of `selected` in `context`. */
function wordsAfter(selected: string, context: string): string[] {
  const match = new RegExp(`(?<![A-Za-z'])${escapeRegExp(selected)}(?![A-Za-z'])`, "i").exec(context);
  if (!match) return [];
  const rest = context.slice(match.index + match[0].length);
  return (rest.match(/[A-Za-z']+/g) ?? []).slice(0, MAX_PARTICLES).map((word) => word.toLowerCase());
}

/**
 * The words of an idiom after its headword, or null when the idiom does not
 * start with the headword: "to look after" → ["after"], "to look back upon (to)" → ["back", "upon"].
 */
function idiomTail(phrase: string, headword: string): string[] | null {
  const words = phrase
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/^\s*to\s+/, "")
    .match(/[a-z'-]+/g);
  if (!words || words[0] !== headword || words.length < 2) return null;
  const tail = words.slice(1);
  return tail.length <= MAX_PARTICLES ? tail : null;
}

/**
 * The idiom of `entry` that the context sentence uses, found by plain string
 * matching: the words right after the selected word must equal the idiom's
 * words after its headword ("she looks after" → "to look after"). The longest
 * match wins, so "looks out for" picks "to look out for" over "to look out".
 * A split phrasal verb ("look the word up") is not detected.
 */
export function findContextIdiom(
  entry: DictionaryEntry,
  selected: string,
  context: string | null | undefined,
): DictionarySense | null {
  if (!context) return null;
  const after = wordsAfter(selected, context);
  if (after.length === 0) return null;

  let best: { sense: DictionarySense; length: number } | null = null;
  for (const sense of entry.senses) {
    if (sense.kind !== "idiom") continue;
    for (const phrase of sense.label.split(" / ")) {
      const tail = idiomTail(phrase, entry.headword);
      if (!tail || tail.some((word, i) => after[i] !== word)) continue;
      if (!best || tail.length > best.length) best = { sense, length: tail.length };
    }
  }
  return best?.sense ?? null;
}
