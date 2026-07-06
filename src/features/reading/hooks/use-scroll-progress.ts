"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Returns 0..1 representing how far the user has scrolled through a container.
 *
 * - 0 at the top (no scroll yet)
 * - 1 at the bottom (scrollTop + clientHeight = scrollHeight)
 *
 * The hook attaches a passive `scroll` listener to the resolved DOM node and
 * reads layout on `requestAnimationFrame` to avoid forcing a synchronous reflow
 * during render. Returns 0 on the server and while no container is mounted.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let frame = 0;

    const compute = () => {
      frame = 0;
      const max = node.scrollHeight - node.clientHeight;
      if (max <= 0) {
        setProgress(0);
        return;
      }
      const next = Math.max(0, Math.min(1, node.scrollTop / max));
      setProgress(next);
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(compute);
    };

    compute();
    node.addEventListener("scroll", schedule, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    resizeObserver?.observe(node);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      node.removeEventListener("scroll", schedule);
      resizeObserver?.disconnect();
    };
  }, [ref]);

  return progress;
}
