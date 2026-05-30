import { describe, expect, it } from "vitest";
import {
  calculateStudyTranslationIconPosition,
  calculateStudyTranslationPopupPosition,
} from "@/features/study/study-translation-popup";

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

describe("calculateStudyTranslationIconPosition", () => {
  it("places the icon after the mouse-up cursor point", () => {
    const position = calculateStudyTranslationIconPosition({
      selectionRect: { top: 100, left: 120, width: 260, height: 20 },
      actionRect: { top: 180, left: 244, width: 0, height: 0 },
      viewportWidth: 800,
    });

    expect(position).toEqual({ top: 186, left: 250 });
  });

  it("uses the selection action rect for backward selections", () => {
    const position = calculateStudyTranslationIconPosition({
      selectionRect: { top: 100, left: 120, width: 260, height: 20 },
      actionRect: { top: 100, left: 120, width: 0, height: 20 },
      viewportWidth: 800,
    });

    expect(position).toEqual({ top: 122, left: 112 });
  });

  it("falls back to the selection right edge when no action rect exists", () => {
    const position = calculateStudyTranslationIconPosition({
      selectionRect: { top: 100, left: 120, width: 260, height: 20 },
      viewportWidth: 800,
    });

    expect(position).toEqual({ top: 122, left: 372 });
  });
});
