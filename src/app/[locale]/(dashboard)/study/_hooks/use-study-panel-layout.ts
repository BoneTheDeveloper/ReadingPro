"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import {
  useDefaultLayout,
  type PanelImperativeHandle,
} from "react-resizable-panels";

const noopStorage = { getItem: () => null, setItem: () => {} };
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Manages study panel layout with resizable panels.
 *
 * Library API usage:
 * - `collapsedSize="60px"` on Panel: library uses this size when collapsed
 * - `collapsible={collapsible}` on Panel: enables/disables collapse ability
 * - `panel.collapse()`: library shrinks to collapsedSize (60px)
 * - `panel.expand()`: library returns to previous expanded size
 *
 * State separation:
 * - `*Collapsible`: Controls Panel's `collapsible` prop (timing-sensitive)
 * - `*Collapsed`: Controls visual state (icon strip) AND separator disabled state
 *
 * Timing pattern (critical):
 * - Collapse: setCollapsible(true) → setTimeout(0) → panel.collapse() → setCollapsed(true)
 * - Expand: panel.expand() → setCollapsed(false) → setTimeout(150) → setCollapsible(false)
 *
 * Why this order? React batches state updates. We must enable collapsible BEFORE
 * calling panel.collapse(), but disable it AFTER expand completes.
 */
export function useStudyPanelLayout() {
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const leftPanelRef = useRef<PanelImperativeHandle>(null);
  const rightPanelRef = useRef<PanelImperativeHandle>(null);

  // Visual state - tells child to show icon strip, and disables separator
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  // Library prop state - enables/disables collapse ability
  const [leftPanelCollapsible, setLeftPanelCollapsible] = useState(false);
  const [rightPanelCollapsible, setRightPanelCollapsible] = useState(false);

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "study-panels",
    panelIds: ["source", "content", "studio"],
    storage: mounted ? sessionStorage : noopStorage,
  });

  const toggleLeft = useCallback(() => {
    const panel = leftPanelRef.current;
    if (!panel) return;

    if (!panel.isCollapsed()) {
      // Collapsing: enable collapsible first, then collapse
      setLeftPanelCollapsible(true);
      setTimeout(() => {
        panel.collapse();
        setLeftPanelCollapsed(true);
      }, 0);
    } else {
      // Expanding: expand first, then disable collapsible after animation
      panel.expand();
      setLeftPanelCollapsed(false);
      setTimeout(() => setLeftPanelCollapsible(false), 150);
    }
  }, []);

  const toggleRight = useCallback(() => {
    const panel = rightPanelRef.current;
    if (!panel) return;

    if (!panel.isCollapsed()) {
      // Collapsing: enable collapsible first, then collapse
      setRightPanelCollapsible(true);
      setTimeout(() => {
        panel.collapse();
        setRightPanelCollapsed(true);
      }, 0);
    } else {
      // Expanding: expand first, then disable collapsible after animation
      panel.expand();
      setRightPanelCollapsed(false);
      setTimeout(() => setRightPanelCollapsible(false), 150);
    }
  }, []);

  // No-op resize handlers - resize doesn't affect collapse state
  const handleLeftResize = useCallback(() => {}, []);
  const handleRightResize = useCallback(() => {}, []);

  return {
    defaultLayout,
    onLayoutChanged,
    leftPanelRef,
    rightPanelRef,
    leftPanelCollapsed,
    rightPanelCollapsed,
    leftPanelCollapsible,
    rightPanelCollapsible,
    toggleLeft,
    toggleRight,
    handleLeftResize,
    handleRightResize,
  };
}
