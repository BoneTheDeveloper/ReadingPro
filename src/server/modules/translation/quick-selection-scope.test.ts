import { describe, expect, it } from "vitest";
import { getQuickSelectionScope } from "./quick-selection-scope";

describe("getQuickSelectionScope", () => {
  it("classifies a single word as dictionary", () => {
    expect(getQuickSelectionScope("bias")).toBe("dictionary");
  });

  it("classifies a short phrase as dictionary", () => {
    expect(getQuickSelectionScope("algorithmic bias")).toBe("dictionary");
  });

  it("classifies a 4-word phrase as dictionary", () => {
    expect(getQuickSelectionScope("natural language processing model")).toBe("dictionary");
  });

  it("classifies a sentence ending with period as machine", () => {
    expect(
      getQuickSelectionScope(
        "Key concerns include algorithmic bias in automated hiring systems.",
      ),
    ).toBe("machine");
  });

  it("classifies a sentence ending with question mark as machine", () => {
    expect(
      getQuickSelectionScope("What are the main concerns about algorithmic bias?"),
    ).toBe("machine");
  });

  it("classifies a multi-line selection as machine", () => {
    expect(
      getQuickSelectionScope("First sentence here.\nSecond sentence here."),
    ).toBe("machine");
  });

  it("classifies a 5-word phrase as machine (exceeds token limit)", () => {
    expect(
      getQuickSelectionScope("a very long phrase with many"),
    ).toBe("machine");
  });

  it("classifies a very long single word as machine (exceeds char limit)", () => {
    expect(getQuickSelectionScope("a".repeat(41))).toBe("machine");
  });
});
