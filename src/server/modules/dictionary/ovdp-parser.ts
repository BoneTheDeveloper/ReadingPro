// Parses the OVDP (Hồ Ngọc Đức) English-Vietnamese definitions into
// `DictionaryEntry` values. Relative imports with `.ts` extensions only:
// scripts/import-dictionary.ts runs this file under plain Node.
//
// Line markup inside one definition:
//   @headword /phonetic/        the entry head
//   * ngoại động từ lit, lighted a part-of-speech group
//   - meaning                    one meaning of the current group
//   =example+ translation        an example of the previous meaning
//   !to look after               an idiom; its meanings follow as "-" lines
//   @Chuyên ngành kỹ thuật       a specialist section; "@Lĩnh vực: điện" narrows it
import { PartOfSpeech } from "../../../shared/enums.ts";
import type {
  DictionaryEntry,
  DictionaryMeaning,
  DictionarySense,
} from "../../../shared/dictionary/schema.ts";
import type { StardictRecord } from "./stardict-reader.ts";

const POS_PREFIXES: ReadonlyArray<readonly [string, PartOfSpeech]> = [
  ["danh từ", PartOfSpeech.NOUN],
  ["nội động từ", PartOfSpeech.VERB],
  ["ngoại động từ", PartOfSpeech.VERB],
  ["trợ động từ", PartOfSpeech.VERB],
  ["động từ", PartOfSpeech.VERB],
  ["tính từ", PartOfSpeech.ADJECTIVE],
  ["phó từ", PartOfSpeech.ADVERB],
  ["trạng từ", PartOfSpeech.ADVERB],
  ["giới từ", PartOfSpeech.PREPOSITION],
  ["liên từ", PartOfSpeech.CONJUNCTION],
];

const DOMAIN_SECTION = "Chuyên ngành";
const DOMAIN_FIELD = "Lĩnh vực";
const IDIOM_SEPARATOR = " / ";

/**
 * Maps a Vietnamese group label to a part of speech by its leading words, so
 * "ngoại động từ lit, lighted" is a VERB and "tính từ & phó từ" an ADJECTIVE.
 */
export function partOfSpeechFromLabel(label: string): PartOfSpeech {
  const lower = label.toLowerCase();
  return POS_PREFIXES.find(([prefix]) => lower.startsWith(prefix))?.[1] ?? PartOfSpeech.OTHER;
}

/** Strips control characters and the BOM, collapses whitespace, and drops the space before commas. */
function clean(text: string): string {
  return text
    .replace(/[\u0000-\u001f\u007f﻿]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/ ,/g, ",")
    .trim();
}

type Parts = { words: DictionarySense[]; idioms: DictionarySense[]; domains: Map<string, DictionarySense> };

function addMeaning(sense: DictionarySense, text: string): DictionaryMeaning {
  // Specialist sections repeat whole blocks in the source.
  const existing = sense.kind === "domain" ? sense.meanings.find((m) => m.text === text) : undefined;
  if (existing) return existing;
  const meaning: DictionaryMeaning = { text, examples: [] };
  sense.meanings.push(meaning);
  return meaning;
}

function domainSense(parts: Parts, label: string): DictionarySense {
  let sense = parts.domains.get(label);
  if (!sense) {
    sense = { kind: "domain", label, partOfSpeech: PartOfSpeech.OTHER, meanings: [] };
    parts.domains.set(label, sense);
  }
  return sense;
}

function parseParts(definition: string, parts: Parts): string | null {
  let phonetic: string | null = null;
  let sense: DictionarySense | null = null;
  let meaning: DictionaryMeaning | null = null;
  let section: string | null = null;

  const ensureSense = (): DictionarySense => {
    if (!sense) {
      sense = { kind: "word", label: "", partOfSpeech: PartOfSpeech.OTHER, meanings: [] };
      parts.words.push(sense);
    }
    return sense;
  };

  for (const raw of definition.split("\n")) {
    const line = raw.replace(/^﻿/, "");
    const marker = line[0];
    const rest = clean(line.slice(1));

    switch (marker) {
      case undefined:
        break;
      case "@":
        if (rest.startsWith(DOMAIN_SECTION)) {
          section = rest;
          sense = domainSense(parts, rest);
        } else if (rest.startsWith(DOMAIN_FIELD)) {
          const field = clean(rest.slice(DOMAIN_FIELD.length).replace(/^\s*:/, ""));
          sense = domainSense(parts, section ? `${section} · ${field}` : `${DOMAIN_FIELD}: ${field}`);
        } else {
          phonetic ??= rest.match(/\/([^/]+)\//)?.[1]?.trim() || null;
          sense = null;
          section = null;
        }
        meaning = null;
        break;
      case "*":
        sense = { kind: "word", label: rest, partOfSpeech: partOfSpeechFromLabel(rest), meanings: [] };
        parts.words.push(sense);
        meaning = null;
        break;
      case "!":
        if (!rest) break;
        // "!with a run" followed by "!by the run" share the meanings below them.
        if (sense?.kind === "idiom" && sense.meanings.length === 0) {
          sense.label += IDIOM_SEPARATOR + rest;
        } else {
          sense = { kind: "idiom", label: rest, partOfSpeech: PartOfSpeech.PHRASE, meanings: [] };
          parts.idioms.push(sense);
        }
        meaning = null;
        break;
      case "=": {
        if (!meaning) break;
        const plus = rest.indexOf("+");
        const en = clean(plus < 0 ? rest : rest.slice(0, plus));
        const vi = plus < 0 ? "" : clean(rest.slice(plus + 1));
        if (en) meaning.examples.push({ en, vi });
        break;
      }
      case "/":
        phonetic ??= clean(line).replace(/^\/|\/$/g, "").trim() || null;
        break;
      default: {
        // "-" and "+" mark a meaning; an unmarked line is a meaning the source lost its marker on.
        const text = marker === "-" || marker === "+" ? rest : clean(line);
        if (text) meaning = addMeaning(ensureSense(), text);
      }
    }
  }
  return phonetic;
}

function toEntry(headword: string, displayHeadword: string, definitions: string[]): DictionaryEntry | null {
  const parts: Parts = { words: [], idioms: [], domains: new Map() };
  let phonetic: string | null = null;
  for (const definition of definitions) {
    const found = parseParts(definition, parts);
    phonetic ??= found;
  }
  // General meanings first, then idioms, then specialist fields.
  const senses = [...parts.words, ...parts.idioms, ...parts.domains.values()].filter(
    (sense) => sense.meanings.length > 0,
  );
  return senses.length > 0 ? { headword, displayHeadword, phonetic, senses } : null;
}

/** Parses one definition; returns null when it has no meanings. */
export function parseOvdpDefinition(word: string, definition: string): DictionaryEntry | null {
  const display = word.trim();
  return toEntry(display.toLowerCase(), display, [definition]);
}

/** True for a headword a reader can select: one token, with a letter, not a metadata record. */
function isSelectableHeadword(word: string): boolean {
  return word.length > 0 && !/\s/.test(word) && /[a-z]/i.test(word) && !word.startsWith("00-database");
}

/**
 * Turns the StarDict records into one entry per lowercased single-token
 * headword. Case variants ("Run", "run") are merged, the lowercase spelling's
 * meanings first.
 */
export function buildDictionary(records: Iterable<StardictRecord>): DictionaryEntry[] {
  const variants = new Map<string, StardictRecord[]>();
  for (const record of records) {
    const word = record.word.trim();
    if (!isSelectableHeadword(word)) continue;
    const key = word.toLowerCase();
    const list = variants.get(key);
    if (list) list.push({ word, definition: record.definition });
    else variants.set(key, [{ word, definition: record.definition }]);
  }

  const entries: DictionaryEntry[] = [];
  for (const [key, list] of variants) {
    // Stable sort: the lowercase spelling, then the rest in source order.
    list.sort((a, b) => Number(a.word !== key) - Number(b.word !== key));
    const entry = toEntry(key, list[0].word, list.map((record) => record.definition));
    if (entry) entries.push(entry);
  }
  return entries;
}
