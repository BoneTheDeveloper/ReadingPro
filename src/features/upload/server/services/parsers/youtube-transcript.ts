import { YoutubeTranscript } from "youtube-transcript";
/**
 * Fetch transcript from YouTube video.
 * Returns null if no transcript available.
 */
export async function fetchTranscript(
  videoId: string
): Promise<string | null> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: "en",
    });

    if (!transcript || transcript.length === 0) {
      return null;
    }

    // Join all text segments
    return transcript.map((item) => item.text).join(" ");
  } catch {
    // No transcript available for this video
    return null;
  }
}
