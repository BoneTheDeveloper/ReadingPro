import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { studyDeletePassageAction } from "@/features/study/actions/study-delete-passage-action";
import type { PassageData } from "../model/types";
import { useStudyWorkspaceState } from "./use-study-workspace-state";

vi.mock("@/features/study/actions/study-delete-passage-action", () => ({
  studyDeletePassageAction: vi.fn(),
}));

const passageA: PassageData = {
  id: "passage-a",
  title: "Older Passage",
  content: "Original content",
  simplifiedContent: null,
  originalLevel: "B1",
  simplifiedLevel: null,
  wordCount: 120,
  createdAt: Date.UTC(2026, 0, 10),
  sourceType: "TEXT",
};

const passageB: PassageData = {
  id: "passage-b",
  title: "Newer Passage",
  content: "Newer content",
  simplifiedContent: "Simple newer content",
  originalLevel: "C1",
  simplifiedLevel: "B2",
  wordCount: 240,
  createdAt: Date.UTC(2026, 1, 20),
  sourceType: "PDF",
};

describe("useStudyWorkspaceState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds initial state with newest passage active and sorted document summaries", () => {
    const { result } = renderHook(() => useStudyWorkspaceState([passageA, passageB]));

    expect(result.current.state).toMatchObject({
      passages: [passageA, passageB],
      activePassageId: "passage-b",
      status: "ready",
      error: null,
      simplifying: false,
      uploadModalOpen: false,
      artifactsByPassageId: {},
      viewingArtifactByPassageId: {},
      artifactDetailById: {},
    });
    expect(result.current.activePassage).toEqual(passageB);
    expect(result.current.documents.map((document) => document.id)).toEqual(["passage-b", "passage-a"]);
    expect(result.current.documents[0]).toMatchObject({
      title: "Newer Passage",
      date: "Feb 20, 2026",
      level: "C1",
      wordCount: 240,
      sourceType: "PDF",
    });
  });

  it("initializes idle state when no passages exist", () => {
    const { result } = renderHook(() => useStudyWorkspaceState([]));

    expect(result.current.state.activePassageId).toBeNull();
    expect(result.current.state.status).toBe("idle");
    expect(result.current.activePassage).toBeNull();
  });

  it("selects a different active passage and resets status to ready", () => {
    const { result } = renderHook(() => useStudyWorkspaceState([passageA, passageB]));

    act(() => {
      result.current.setState((prev) => ({ ...prev, status: "idle" }));
      result.current.handleSelectDocument("passage-a");
    });

    expect(result.current.state.activePassageId).toBe("passage-a");
    expect(result.current.activePassage).toEqual(passageA);
    expect(result.current.state.status).toBe("ready");
  });

  it("tracks upload modal, upload progress, success, and upload errors", () => {
    const uploadedPassage: PassageData = {
      ...passageA,
      id: "uploaded",
      title: "Uploaded Passage",
      createdAt: Date.UTC(2026, 2, 1),
    };
    const { result } = renderHook(() => useStudyWorkspaceState([passageA]));

    act(() => {
      result.current.handleOpenUploadModal();
      result.current.handleUploadStart("story.pdf");
    });

    expect(result.current.state.uploadModalOpen).toBe(true);
    expect(result.current.isUploading).toBe(true);
    expect(result.current.uploadingFileName).toBe("story.pdf");

    act(() => {
      result.current.handleUploadComplete(uploadedPassage);
    });

    expect(result.current.state.passages).toEqual([passageA, uploadedPassage]);
    expect(result.current.state.activePassageId).toBe("uploaded");
    expect(result.current.state.uploadModalOpen).toBe(false);
    expect(result.current.state.status).toBe("ready");
    expect(result.current.state.error).toBeNull();
    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadingFileName).toBe("");

    act(() => {
      result.current.handleOpenUploadModal();
      result.current.handleUploadStart("bad.pdf");
      result.current.handleUploadError("Upload failed");
    });

    expect(result.current.state.error).toBe("Upload failed");
    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadingFileName).toBe("");

    act(() => {
      result.current.handleCloseUploadModal();
    });

    expect(result.current.state.uploadModalOpen).toBe(false);
  });

  it("deletes active passage and falls back to the newest remaining passage", async () => {
    vi.mocked(studyDeletePassageAction).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useStudyWorkspaceState([passageA, passageB]));

    act(() => {
      result.current.setState((prev) => ({
        ...prev,
        status: "ready",
      }));
    });

    await act(async () => {
      await result.current.handleDeletePassage("passage-b");
    });

    expect(studyDeletePassageAction).toHaveBeenCalledWith({ passageId: "passage-b" });
    expect(result.current.state.passages).toEqual([passageA]);
    expect(result.current.state.activePassageId).toBe("passage-a");
    expect(result.current.state.artifactsByPassageId).toEqual({});
    expect(result.current.state.status).toBe("ready");
  });

  it("deletes active passage and clears state when no passages remain", async () => {
    vi.mocked(studyDeletePassageAction).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useStudyWorkspaceState([passageB]));

    await act(async () => {
      await result.current.handleDeletePassage("passage-b");
    });

    expect(result.current.state.passages).toEqual([]);
    expect(result.current.state.activePassageId).toBeNull();
    expect(result.current.state.status).toBe("idle");
  });

  it("deletes non-active passage without changing active state", async () => {
    vi.mocked(studyDeletePassageAction).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useStudyWorkspaceState([passageA, passageB]));

    act(() => {
      result.current.setState((prev) => ({
        ...prev,
        status: "ready",
      }));
    });

    await act(async () => {
      await result.current.handleDeletePassage("passage-a");
    });

    expect(result.current.state.passages).toEqual([passageB]);
    expect(result.current.state.activePassageId).toBe("passage-b");
    expect(result.current.state.status).toBe("ready");
  });

  it("keeps local state and stores the server error when delete fails", async () => {
    vi.mocked(studyDeletePassageAction).mockResolvedValue({ error: "Cannot delete passage" });
    const { result } = renderHook(() => useStudyWorkspaceState([passageA, passageB]));

    await act(async () => {
      await result.current.handleDeletePassage("passage-b");
    });

    expect(result.current.state.passages).toEqual([passageA, passageB]);
    expect(result.current.state.activePassageId).toBe("passage-b");
    expect(result.current.state.error).toBe("Cannot delete passage");
  });
});
