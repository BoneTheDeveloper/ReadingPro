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
      ["A1", "Beginner", "bg-cefr-a1/40 text-green-800"],
      ["A2", "Elementary", "bg-cefr-a2/40 text-lime-800"],
      ["B1", "Intermediate", "bg-cefr-b1/40 text-yellow-800"],
      ["B2", "Upper Intermediate", "bg-cefr-b2/40 text-amber-800"],
      ["C1", "Advanced", "bg-cefr-c1/40 text-pink-800"],
      ["C2", "Proficient", "bg-cefr-c2/40 text-purple-800"],
    ];

    for (const [level, label, color] of expectations) {
      expect(getCEFRLabel(level)).toBe(label);
      expect(getCEFRColor(level)).toBe(color);
    }
  });

  it("maps simplifiable levels to their target level", () => {
    expect(getTargetCEFRLevel("C2")).toBe("C1");
    expect(getTargetCEFRLevel("C1")).toBe("B2");
    expect(getTargetCEFRLevel("B2")).toBe("B1");
    expect(getTargetCEFRLevel("B1")).toBe("A2");
    expect(getTargetCEFRLevel("A2")).toBeNull();
    expect(isSimplifiableCEFRLevel("B1")).toBe(true);
    expect(isSimplifiableCEFRLevel("A2")).toBe(false);
    expect(isSimplifiableCEFRLevel(null)).toBe(false);
  });

  it("classifies text with sentence length and long-word heuristics", () => {
    expect(getHeuristicCEFR("Short text. Easy words.")).toBe("A1");
    expect(getHeuristicCEFR("One two three four five six seven eight nine ten eleven.")).toBe("A2");
    expect(getHeuristicCEFR("One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen.")).toBe("B1");
    expect(getHeuristicCEFR("One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone.")).toBe("B2");
    expect(getHeuristicCEFR("antidisestablishmentarianism concise words")).toBe("C1");
  });
});
