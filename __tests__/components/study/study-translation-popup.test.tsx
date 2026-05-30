import { describe, expect, it } from "vitest";
import { calculateStudyTranslationPopupPosition } from "@/features/study/study-translation-popup";

describe("calculateStudyTranslationPopupPosition", () => {
  it("positions flipped popup fully above the selection using actual popup height", () => {
    const position = calculateStudyTranslationPopupPosition({
      selectionRect: { top: 560, left: 240, width: 80, height: 20 },
      viewportWidth: 800,
      viewportHeight: 600,
      popupHeight: 180,
    });

    expect(position.showAbove).toBe(true);
    expect(position.top).toBe(372);
    expect(position.top + 180).toBeLessThanOrEqual(552);
  });

  it("clamps popup within the viewport horizontally", () => {
    const position = calculateStudyTranslationPopupPosition({
      selectionRect: { top: 100, left: 780, width: 30, height: 20 },
      viewportWidth: 800,
      viewportHeight: 600,
      popupHeight: 120,
    });

    expect(position.left).toBe(512);
  });
});
