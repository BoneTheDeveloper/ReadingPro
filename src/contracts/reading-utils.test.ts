import { describe, expect, it } from "vitest";
import {
  calculateReadingTime,
  identifyChallengingWords,
  parsePassageForDisplay,
} from "./reading-utils";

describe("reading-utils", () => {
  describe("identifyChallengingWords", () => {
    it("highlights non-common words that meet the CEFR length threshold", () => {
      const words = identifyChallengingWords(
        "The cat discovered extraordinary architecture.",
        "B1"
      );

      expect(words).toEqual([
        { word: "discovered", startIndex: 8, endIndex: 18 },
        { word: "extraordinary", startIndex: 19, endIndex: 32 },
        { word: "architecture", startIndex: 33, endIndex: 45 },
      ]);
    });

    it("falls back to B1 behavior for unknown levels and ignores C2", () => {
      expect(identifyChallengingWords("Curious students collaborate daily.", "unknown")).toEqual([
        { word: "curious", startIndex: 0, endIndex: 7 },
        { word: "students", startIndex: 8, endIndex: 16 },
        { word: "collaborate", startIndex: 17, endIndex: 28 },
      ]);
      expect(identifyChallengingWords("extraordinary architecture", "C2")).toEqual([]);
    });
  });

  it("parses paragraphs separated by blank lines while preserving paragraph text", () => {
    expect(parsePassageForDisplay("First paragraph.\n\nSecond paragraph.\n\n\nThird.")).toEqual([
      "First paragraph.",
      "Second paragraph.",
      "Third.",
    ]);
  });

  it("calculates reading time from CEFR speed with a B1 fallback", () => {
    expect(calculateReadingTime(181, "B2")).toBe("~2 min read");
    expect(calculateReadingTime(151, "unknown")).toBe("~2 min read");
    expect(calculateReadingTime(0, "A1")).toBe("~0 min read");
  });
});
