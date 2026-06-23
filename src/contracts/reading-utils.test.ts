import { describe, expect, it } from "vitest";
import {
  identifyChallengingWords,
  parsePassageForDisplay,
} from "./reading-utils";

describe("reading-utils", () => {
  it("highlights non-common words that meet the CEFR length threshold", () => {
    expect(
      identifyChallengingWords("The cat discovered extraordinary architecture.", "B1"),
    ).toEqual([
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

  it("parses paragraphs separated by blank lines", () => {
    expect(parsePassageForDisplay("First paragraph.\n\nSecond paragraph.\n\n\nThird.")).toEqual([
      "First paragraph.",
      "Second paragraph.",
      "Third.",
    ]);
  });
});
