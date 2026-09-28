import { YoutubeTranscript } from "youtube-transcript";

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

    return transcript.map((item) => item.text).join(" ");
  } catch {
    return null;
  }
}
