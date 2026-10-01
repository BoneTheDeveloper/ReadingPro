import { YoutubeTranscript } from "youtube-transcript";
import { extractVideoId } from "@/shared/passage/youtube-url";
import { AppError } from "@/server/lib/errors";

async function fetchTranscript(
  videoId: string
): Promise<string | null> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: "en",
    });

    if (!transcript || transcript.length === 0) {
      return null;
    }

    return transcript.map((item) => item.text).join(" ");
  } catch {
    return null;
  }
}

/** The video's English transcript, or an AppError the client can show. */
export async function requireTranscript(youtubeUrl: string): Promise<string> {
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) throw new AppError("youtube.url_invalid", "YouTube URL is invalid");

  const transcript = await fetchTranscript(videoId);
  if (!transcript) throw new AppError("youtube.no_transcript", "Video has no transcript");

  return transcript;
}
