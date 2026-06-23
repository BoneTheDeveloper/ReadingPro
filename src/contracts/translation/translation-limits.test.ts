import { describe, expect, it } from "vitest";
import {
  clampTranslationContext,
  isTranslateTextWithinLimit,
  MAX_TRANSLATE_CONTEXT_LENGTH,
  MAX_TRANSLATE_TEXT_LENGTH,
} from "./translation-limits";

describe("clampTranslationContext", () => {
  it("keeps short context unchanged", () => {
    expect(clampTranslationContext("Short context.", "context")).toBe("Short context.");
  });

  it("clamps long context around the selected text", () => {
    const selectedText = "algorithmic bias";
    const context = `${"a".repeat(3000)}${selectedText}${"b".repeat(3000)}`;
    const clamped = clampTranslationContext(context, selectedText);

    expect(clamped.length).toBe(MAX_TRANSLATE_CONTEXT_LENGTH);
    expect(clamped).toContain(selectedText);
  });
});

describe("isTranslateTextWithinLimit", () => {
  it("rejects text over the configured quick-translation limit", () => {
    expect(isTranslateTextWithinLimit("a".repeat(MAX_TRANSLATE_TEXT_LENGTH))).toBe(true);
    expect(isTranslateTextWithinLimit("a".repeat(MAX_TRANSLATE_TEXT_LENGTH + 1))).toBe(false);
  });
});
