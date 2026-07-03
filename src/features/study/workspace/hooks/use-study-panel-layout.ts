"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import {
  useDefaultLayout,
  type PanelImperativeHandle,
  type PanelSize,
} from "react-resizable-panels";

const noopStorage = { getItem: () => null, setItem: () => {} };
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const COLLAPSED_SIZE_PX = 60;
const COLLAPSED_THRESHOLD_PX = COLLAPSED_SIZE_PX + 4;

/**
 * Determines whether a panel is currently at its collapsed size, based on
 * the panel's pixel width reported by the library. The library does NOT
 * expose an `onCollapse` / `onExpand` callback — `onResize` is the only
 * resize event — so we mirror the state into React via `onResize`.
 */
function isCollapsedSize(panelSize: PanelSize | undefined): boolean {
  if (!panelSize) return false;
  return panelSize.inPixels <= COLLAPSED_THRESHOLD_PX;
}

/**
 * `collapsible` is always true so the library collapses to `collapsedSize`
 * (60px) when the user drags past `minSize`, and so `panel.collapse()` works
 * as a programmatic toggle. `collapsedSize` (60) is intentionally smaller than
 * `minSize` (200) — that's the supported relationship: `minSize` is the
 * minimum *expanded* width, `collapsedSize` is the snap target on collapse.
 *
 * `leftPanelCollapsed` / `rightPanelCollapsed` are mirrored from the Panel's
 * `onResize` callback. The library only fires this on resize, so collapsing
 * programmatically via `panel.collapse()` will fire `onResize` synchronously
 * with `inPixels ≈ 60`, which we mirror to React state. Expanding fires it
 * with the prior expanded width, mirroring back to `false`.
 *
 * Avoids dual-state — collapse/expand logic uses the imperative handle, and
 * the React mirror is purely a view concern (icon-strip vs full panel layout).
 */
export function useStudyPanelLayout() {
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const leftPanelRef = useRef<PanelImperativeHandle>(null);
  const rightPanelRef = useRef<PanelImperativeHandle>(null);

  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "study-panels",
    panelIds: ["source", "content", "studio"],
    storage: mounted ? sessionStorage : noopStorage,
  });

  const toggleLeft = useCallback(() => {
    const panel = leftPanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
  }, []);

  const toggleRight = useCallback(() => {
    const panel = rightPanelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
  }, []);

  // Mirror `onResize` into collapsed booleans. Threshold matches collapsedSize.
  const handleLeftResize = useCallback((panelSize: PanelSize) => {
    setLeftPanelCollapsed(isCollapsedSize(panelSize));
  }, []);
  const handleRightResize = useCallback((panelSize: PanelSize) => {
    setRightPanelCollapsed(isCollapsedSize(panelSize));
  }, []);

  return {
    defaultLayout,
    onLayoutChanged,
    leftPanelRef,
    rightPanelRef,
    leftPanelCollapsed,
    rightPanelCollapsed,
    toggleLeft,
    toggleRight,
    handleLeftResize,
    handleRightResize,
  };
}
