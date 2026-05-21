import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDefaultLayout, type Layout, type PanelImperativeHandle } from "react-resizable-panels";
import { useStudyPanelLayout } from "./use-study-panel-layout";

vi.mock("react-resizable-panels", () => ({
  useDefaultLayout: vi.fn(() => ({
    defaultLayout: [25, 50, 25] as unknown as Layout,
    onLayoutChanged: vi.fn(),
  })),
}));

function createPanel(collapsed = false): PanelImperativeHandle {
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

describe("useStudyPanelLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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

  it("collapses and expands the left panel with the expected transient state", () => {
    const panel = createPanel(false);
    const { result } = renderHook(() => useStudyPanelLayout());

    act(() => {
      result.current.leftPanelRef.current = panel;
      result.current.toggleLeft();
    });

    expect(result.current.leftCollapsible).toBe(true);
    expect(panel.collapse).not.toHaveBeenCalled();

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(panel.collapse).toHaveBeenCalledTimes(1);
    expect(result.current.leftPanelCollapsed).toBe(true);

    act(() => {
      result.current.toggleLeft();
    });

    expect(panel.expand).toHaveBeenCalledTimes(1);
    expect(result.current.leftPanelCollapsed).toBe(false);
    expect(result.current.leftCollapsible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current.leftCollapsible).toBe(false);
  });

  it("collapses and expands the right panel independently", () => {
    const panel = createPanel(false);
    const { result } = renderHook(() => useStudyPanelLayout());

    act(() => {
      result.current.rightPanelRef.current = panel;
      result.current.toggleRight();
    });

    expect(result.current.rightCollapsible).toBe(true);

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(panel.collapse).toHaveBeenCalledTimes(1);
    expect(result.current.rightPanelCollapsed).toBe(true);

    act(() => {
      result.current.toggleRight();
      vi.advanceTimersByTime(150);
    });

    expect(panel.expand).toHaveBeenCalledTimes(1);
    expect(result.current.rightPanelCollapsed).toBe(false);
    expect(result.current.rightCollapsible).toBe(false);
  });

  it("leaves panel state unchanged when refs are not attached", () => {
    const { result } = renderHook(() => useStudyPanelLayout());

    act(() => {
      result.current.toggleLeft();
      result.current.toggleRight();
      vi.runOnlyPendingTimers();
    });

    expect(result.current.leftPanelCollapsed).toBe(false);
    expect(result.current.leftCollapsible).toBe(false);
    expect(result.current.rightPanelCollapsed).toBe(false);
    expect(result.current.rightCollapsible).toBe(false);
  });
});
