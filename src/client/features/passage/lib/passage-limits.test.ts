import { describe, expect, it } from "vitest";
import { PLAN_PASSAGE_LIMITS, countWords } from "@/shared/plan/plans";
import { passageGenerationOptionsSchema } from "@/shared/passage/schema";
import { sourceSizeError } from "./passage-limits";

const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");

describe("passage size gate", () => {
  it("counts whitespace-separated words, ignoring extra spaces and newlines", () => {
    expect(countWords("  one\n\ntwo   three\t")).toBe(3);
    expect(countWords("")).toBe(0);
  });

  it("rejects sources under 50 words", () => {
    expect(sourceSizeError(words(49), false)).toContain("ít nhất 50 từ");
    expect(sourceSizeError(words(50), false)).toBeNull();
  });

  it("scales the maximum with the plan", () => {
    const freeMax = PLAN_PASSAGE_LIMITS.FREE.maxSourceWords;
    expect(sourceSizeError(words(freeMax), false)).toBeNull();
    expect(sourceSizeError(words(freeMax + 1), false)).toContain("nâng cấp Pro");
    expect(sourceSizeError(words(freeMax + 1), true)).toBeNull();
    expect(sourceSizeError(words(PLAN_PASSAGE_LIMITS.PRO.maxSourceWords + 1), true)).toContain("chia thành nhiều phần");
  });

  it("defaults the target to 400 words and caps it at the Pro ceiling", () => {
    expect(passageGenerationOptionsSchema.parse({}).targetWords).toBe(400);
    expect(passageGenerationOptionsSchema.safeParse({ targetWords: PLAN_PASSAGE_LIMITS.PRO.maxTargetWords + 50 }).success).toBe(false);
    expect(passageGenerationOptionsSchema.safeParse({ targetWords: 100 }).success).toBe(false);
  });
});
