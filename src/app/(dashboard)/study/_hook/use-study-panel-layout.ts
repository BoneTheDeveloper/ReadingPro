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

function isCollapsedSize(panelSize: PanelSize | undefined): boolean {
  if (!panelSize) return false;
  return panelSize.inPixels <= COLLAPSED_THRESHOLD_PX;
}

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