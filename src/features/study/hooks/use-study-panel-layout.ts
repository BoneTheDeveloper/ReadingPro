"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { useDefaultLayout, type PanelImperativeHandle } from "react-resizable-panels";

const noopStorage = { getItem: () => null, setItem: () => {} };
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function useStudyPanelLayout() {
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [leftCollapsible, setLeftCollapsible] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [rightCollapsible, setRightCollapsible] = useState(false);

  const leftPanelRef = useRef<PanelImperativeHandle>(null);
  const rightPanelRef = useRef<PanelImperativeHandle>(null);

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "study-panels",
    panelIds: ["source", "content", "studio"],
    storage: mounted ? sessionStorage : noopStorage,
  });

  const toggleLeft = useCallback(() => {
    const panel = leftPanelRef.current;
    if (!panel) return;

    if (!panel.isCollapsed()) {
      setLeftCollapsible(true);
      setTimeout(() => {
        panel.collapse();
        setLeftPanelCollapsed(true);
      }, 0);
      return;
    }

    panel.expand();
    setLeftPanelCollapsed(false);
    setTimeout(() => setLeftCollapsible(false), 150);
  }, []);

  const toggleRight = useCallback(() => {
    const panel = rightPanelRef.current;
    if (!panel) return;

    if (!panel.isCollapsed()) {
      setRightCollapsible(true);
      setTimeout(() => {
        panel.collapse();
        setRightPanelCollapsed(true);
      }, 0);
      return;
    }

    panel.expand();
    setRightPanelCollapsed(false);
    setTimeout(() => setRightCollapsible(false), 150);
  }, []);

  return {
    defaultLayout,
    onLayoutChanged,
    leftPanelRef,
    rightPanelRef,
    leftPanelCollapsed,
    leftCollapsible,
    rightPanelCollapsed,
    rightCollapsible,
    toggleLeft,
    toggleRight,
  };
}
