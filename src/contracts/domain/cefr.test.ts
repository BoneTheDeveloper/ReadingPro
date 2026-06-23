import { describe, expect, it } from "vitest";
import {
  getCEFRLabel,
  getHeuristicCEFR,
  getTargetCEFRLevel,
  isSimplifiableCEFRLevel,
  type CEFRLevel,
} from "./cefr";
import { getCEFRColor } from "../ui/cefr-style";

describe("CEFR helpers", () => {
  it("returns labels and display colors for all supported levels", () => {
    const expectations: Array<[CEFRLevel, string, string]> = [
      ["A1", "Beginner", "bg-cefr-a1 text-cefr-a1-text"],
      ["A2", "Elementary", "bg-cefr-a2 text-cefr-a2-text"],
      ["B1", "Intermediate", "bg-cefr-b1 text-cefr-b1-text"],
      ["B2", "Upper Intermediate", "bg-cefr-b2 text-cefr-b2-text"],
      ["C1", "Advanced", "bg-cefr-c1 text-cefr-c1-text"],
      ["C2", "Proficient", "bg-cefr-c2 text-cefr-c2-text"],
    ];

    for (const [level, label, color] of expectations) {
      expect(getCEFRLabel(level)).toBe(label);
      expect(getCEFRColor(level)).toBe(color);
    }
  });

  it("classifies text by length and marks A2 as not simplifiable", () => {
    expect(getHeuristicCEFR("Short text. Easy words.")).toBe("A1");
    expect(getHeuristicCEFR("antidisestablishmentarianism concise words")).toBe("C1");

    expect(getTargetCEFRLevel("C2")).toBe("C1");
    expect(getTargetCEFRLevel("B1")).toBe("A2");
    expect(getTargetCEFRLevel("A2")).toBeNull();
    expect(isSimplifiableCEFRLevel("B1")).toBe(true);
    expect(isSimplifiableCEFRLevel("A2")).toBe(false);
  });
});
