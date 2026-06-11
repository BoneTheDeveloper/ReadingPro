import { describe, expect, it } from "vitest";
import {
  calculateCursorActionRect,
  calculateSelectionActionRect,
} from "./selection-utils";

describe("calculateCursorActionRect", () => {
  it("creates a zero-size action rect from the mouse-up cursor point", () => {
    expect(calculateCursorActionRect({ x: 244, y: 180 })).toEqual({
      top: 180,
      left: 244,
      width: 0,
      height: 0,
    });
  });
});

describe("calculateSelectionActionRect", () => {
  const selectionRect = { top: 100, left: 120, width: 260, height: 44 };
  const clientRects = [
    { top: 100, left: 120, width: 160, height: 20 },
    { top: 124, left: 80, width: 300, height: 20 },
  ];

  it("places the action rect at the end of a forward selection", () => {
    expect(
      calculateSelectionActionRect({
        selectionRect,
        clientRects,
        isBackward: false,
      }),
    ).toEqual({ top: 124, left: 380, width: 0, height: 20 });
  });

  it("uses the cursor point when it ends near the selected text", () => {
    expect(
      calculateSelectionActionRect({
        selectionRect,
        clientRects,
        isBackward: true,
        cursorPoint: { x: 112, y: 104 },
      }),
    ).toEqual({ top: 104, left: 112, width: 0, height: 0 });
  });

  it("places the action rect at the start of a backward selection", () => {
    expect(
      calculateSelectionActionRect({
        selectionRect,
        clientRects,
        isBackward: true,
      }),
    ).toEqual({ top: 100, left: 120, width: 0, height: 20 });
  });

  it("falls back to the selection edge when the cursor ends far from the text", () => {
    expect(
      calculateSelectionActionRect({
        selectionRect,
        clientRects,
        isBackward: true,
        cursorPoint: { x: 12, y: 40 },
      }),
    ).toEqual({ top: 100, left: 120, width: 0, height: 20 });
  });
});
