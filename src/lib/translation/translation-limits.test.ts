import { describe, expect, it } from "vitest";
import { clampTranslationContext, MAX_TRANSLATE_CONTEXT_LENGTH } from "./translation-limits";

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

  it("falls back to the leading slice when selected text is absent", () => {
    const context = "a".repeat(MAX_TRANSLATE_CONTEXT_LENGTH + 100);

    expect(clampTranslationContext(context, "missing")).toBe(
      context.slice(0, MAX_TRANSLATE_CONTEXT_LENGTH),
    );
  });
});
