"use server";

import { fetchTranscript } from "../services/parsers/youtube-transcript";

interface CachedTranscript {
  transcript: string;
  expiresAt: number;
}

// In-memory cache: videoId -> cached transcript
// TTL: 5 minutes - enough time for user to submit after validation
const transcriptCache = new Map<string, CachedTranscript>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedTranscript(videoId: string): string | null {
  const cached = transcriptCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.transcript;
  }
  transcriptCache.delete(videoId);
  return null;
}

function setCachedTranscript(videoId: string, transcript: string): void {
  transcriptCache.set(videoId, {
    transcript,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export async function checkTranscriptAvailability(videoId: string) {
  // Check cache first
  const cached = getCachedTranscript(videoId);
  if (cached !== null) {
    return { success: true, cached: true };
  }

  try {
    const transcript = await fetchTranscript(videoId);

    if (!transcript) {
      return { success: false, message: "Video này không có phụ đề/captions." };
    }

    // Cache the transcript for subsequent upload
    setCachedTranscript(videoId, transcript);

    return { success: true, cached: false };
  } catch (_error) {
    return { success: false, message: "Không thể kiểm tra phụ đề video này." };
  }
}

/**
 * Get cached transcript for upload.
 * Returns null if not in cache or expired.
 */
export async function getCachedTranscriptForUpload(videoId: string): Promise<string | null> {
  return getCachedTranscript(videoId);
}
