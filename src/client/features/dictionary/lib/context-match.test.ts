import { describe, expect, it } from "vitest";
import type { DictionaryEntry } from "@/shared/dictionary/schema";
import { findContextIdiom } from "./context-match";

const idiom = (label: string) => ({
  kind: "idiom" as const,
  label,
  partOfSpeech: "PHRASE" as const,
  meanings: [{ text: label, examples: [] }],
});

const look: DictionaryEntry = {
  headword: "look",
  displayHeadword: "look",
  phonetic: "luk",
  senses: [
    { kind: "word", label: "động từ", partOfSpeech: "VERB", meanings: [{ text: "nhìn", examples: [] }] },
    idiom("to look after"),
    idiom("to look out"),
    idiom("to look out for"),
    idiom("to look back upon (to)"),
    idiom("one must not hang a man by his looks / do not judge a man by his looks"),
  ],
};

const match = (selected: string, context: string) => findContextIdiom(look, selected, context)?.label ?? null;

describe("findContextIdiom", () => {
  it("matches the particle right after the selected word, ignoring case and punctuation", () => {
    expect(match("looks", "She Looks after her brother.")).toBe("to look after");
    expect(match("looked", "He looked back upon his youth")).toBe("to look back upon (to)");
  });

  it("prefers the longest idiom", () => {
    expect(match("look", "Look out for cars!")).toBe("to look out for");
    expect(match("look", "Look out!")).toBe("to look out");
  });

  it("finds nothing for a split phrasal verb, a plain use, or no context", () => {
    expect(match("look", "Look the word up.")).toBeNull();
    expect(match("looked", "They looked at me.")).toBeNull();
    expect(findContextIdiom(look, "look", undefined)).toBeNull();
  });

  it("does not match inside a longer word", () => {
    expect(match("look", "The outlook after the war was bright.")).toBeNull();
  });
});
