import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  useDefaultLayout,
  type Layout,
  type PanelImperativeHandle,
  type PanelSize,
} from "react-resizable-panels";
import { useStudyPanelLayout } from "./use-study-panel-layout";

vi.mock("react-resizable-panels", () => ({
  useDefaultLayout: vi.fn(() => ({
    defaultLayout: [25, 50, 25] as unknown as Layout,
    onLayoutChanged: vi.fn(),
  })),
}));

function createPanel(initialCollapsed = false): PanelImperativeHandle {
  let collapsed = initialCollapsed;
  return {
    isCollapsed: vi.fn(() => collapsed),
    collapse: vi.fn(() => {
      collapsed = true;
    }),
    expand: vi.fn(() => {
      collapsed = false;
    }),
    getSize: vi.fn(() => ({ asPercentage: 25, inPixels: 250 })),
    resize: vi.fn(),
  };
}

function makeSize(inPixels: number): PanelSize {
  return { asPercentage: 0, inPixels };
}

describe("useStudyPanelLayout", () => {
  it("wires default layout persistence to sessionStorage after mounting", () => {
    const onLayoutChanged = vi.fn();
    vi.mocked(useDefaultLayout).mockReturnValue({
      defaultLayout: [20, 60, 20] as unknown as Layout,
      onLayoutChange: vi.fn(),
      onLayoutChanged,
    });

    const { result } = renderHook(() => useStudyPanelLayout());

    expect(useDefaultLayout).toHaveBeenCalledWith({
      id: "study-panels",
      panelIds: ["source", "content", "studio"],
      storage: sessionStorage,
    });
    expect(result.current.defaultLayout).toEqual([20, 60, 20]);
    expect(result.current.onLayoutChanged).toBe(onLayoutChanged);
  });

  it("collapses and expands the left panel using only the imperative handle", () => {
    const panel = createPanel(false);
    const { result } = renderHook(() => useStudyPanelLayout());

    act(() => {
      result.current.leftPanelRef.current = panel;
    });
    act(() => {
      result.current.toggleLeft();
    });

    expect(panel.collapse).toHaveBeenCalledTimes(1);
    expect(result.current.leftPanelCollapsed).toBe(false);

    act(() => {
      result.current.toggleLeft();
    });

    expect(panel.expand).toHaveBeenCalledTimes(1);
    expect(result.current.leftPanelCollapsed).toBe(false);
  });

  it("mirrors onResize into the collapsed state when the panel snaps to collapsedSize", () => {
    const panel = createPanel(false);
    const { result } = renderHook(() => useStudyPanelLayout());

    act(() => {
      result.current.leftPanelRef.current = panel;
    });

    expect(result.current.leftPanelCollapsed).toBe(false);

    act(() => {
      result.current.handleLeftResize(makeSize(280));
    });
    expect(result.current.leftPanelCollapsed).toBe(false);

    act(() => {
      result.current.handleLeftResize(makeSize(60));
    });
    expect(result.current.leftPanelCollapsed).toBe(true);

    act(() => {
      result.current.handleLeftResize(makeSize(280));
    });
    expect(result.current.leftPanelCollapsed).toBe(false);
  });

  it("mirrors onResize for the right panel independently", () => {
    const { result } = renderHook(() => useStudyPanelLayout());

    act(() => {
      result.current.handleRightResize(makeSize(280));
    });
    expect(result.current.rightPanelCollapsed).toBe(false);

    act(() => {
      result.current.handleRightResize(makeSize(60));
    });
    expect(result.current.rightPanelCollapsed).toBe(true);
  });

  it("treats values within the 4px threshold of collapsedSize as collapsed", () => {
    const { result } = renderHook(() => useStudyPanelLayout());

    act(() => {
      result.current.handleLeftResize(makeSize(64));
    });
    expect(result.current.leftPanelCollapsed).toBe(true);

    act(() => {
      result.current.handleLeftResize(makeSize(65));
    });
    expect(result.current.leftPanelCollapsed).toBe(false);
  });

  it("leaves panel state unchanged when refs are not attached", () => {
    const { result } = renderHook(() => useStudyPanelLayout());

    act(() => {
      result.current.toggleLeft();
      result.current.toggleRight();
    });

    expect(result.current.leftPanelCollapsed).toBe(false);
    expect(result.current.rightPanelCollapsed).toBe(false);
  });
});