"use client";

/**
 * Module-level per-passage artifact cache.
 *
 * Lives outside the component tree so it survives `StudyWorkspace` remounts
 * (the study page is `force-dynamic` and re-renders the full client tree on
 * every navigation).  Without this, each navigation wipes the stale-time ref
 * and triggers a redundant `getStudioArtifactsAction` call.
 *
 * Exposes plain functions only — no React hooks inside this file.
 * `useStudioArtifactQuery` consumes them via `useSyncExternalStore`.
 */

import * as Sentry from "@sentry/nextjs";
import { getStudioArtifactsAction } from "@/features/studio-panel/server/actions/artifact";
import type { StudioArtifact } from "@/features/studio-panel/schemas/studio-artifact";

const TTL_MS = 60_000;
const EVICT_INTERVAL_MS = 5 * 60_000;

export type Status = "idle" | "loading" | "success" | "error";

export interface CacheEntry {
  artifacts: StudioArtifact[];
  status: Status;
  fetchedAt: number | null;
  /** Shared across concurrent mounts of the same passageId */
  inflight?: Promise<void>;
}

// ---------------------------------------------------------------------------
// Module-level store
// ---------------------------------------------------------------------------

const store = new Map<string, CacheEntry>();
const listeners = new Set<() => void>();
let version = 0;
let evictTimer: ReturnType<typeof setInterval> | null = null;

function notify() {
  version++;
  listeners.forEach((l) => l());
}

function get(passageId: string): CacheEntry {
  let entry = store.get(passageId);
  if (!entry) {
    entry = { artifacts: [], status: "idle", fetchedAt: null };
    store.set(passageId, entry);
  }
  return entry;
}

function evict() {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.status !== "loading" && entry.fetchedAt && now - entry.fetchedAt > TTL_MS) {
      store.delete(id);
      notify();
    }
  }
}

function ensureEvictTimer() {
  if (evictTimer) return;
  if (typeof window === "undefined") return; // client-only
  evictTimer = setInterval(evict, EVICT_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Public API (consumed by useSyncExternalStore)
// ---------------------------------------------------------------------------

export function getEntry(passageId: string): CacheEntry {
  evict(); // TTL eviction on every read keeps map bounded
  return get(passageId);
}

export function subscribe(listener: () => void): () => void {
  ensureEvictTimer();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): number {
  return version;
}

/** Mutate the artifacts array of an entry and notify subscribers. */
export function updateEntryArtifacts(passageId: string, next: StudioArtifact[]) {
  const entry = store.get(passageId);
  if (!entry) return;
  entry.artifacts = next;
  notify();
}

// ---------------------------------------------------------------------------
// Internal fetch (called by useStudioArtifactQuery's useEffect)
// ---------------------------------------------------------------------------

export function fetchIfStale(passageId: string): void {
  const e = get(passageId);
  if (e.status === "loading") return;
  if (e.status === "success" && e.fetchedAt && Date.now() - e.fetchedAt < TTL_MS) return;

  e.status = "loading";
  notify();

  const p = getStudioArtifactsAction(passageId)
    .then(({ artifacts }) => {
      // Drop result if passageId changed while fetch was in flight
      const entry = store.get(passageId);
      if (entry !== e) return;
      entry.artifacts = artifacts;
      entry.status = "success";
      entry.fetchedAt = Date.now();
      notify();
    })
    .catch((err: unknown) => {
      const entry = store.get(passageId);
      if (entry !== e) return;
      entry.status = "error";
      notify();
      Sentry.captureException(err, {
        tags: { scope: "study.fetch-artifacts" },
        extra: { passageId },
      });
    })
    .finally(() => {
      const entry = store.get(passageId);
      if (entry) entry.inflight = undefined;
    });

  e.inflight = p;
}
