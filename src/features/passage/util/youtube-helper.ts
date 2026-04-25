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

export function extractVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const regExp = /^.*(youtu\.be\/|youtube(?:\.googleapis)?\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|live\/)|m\.youtube\.com\/(?:watch\?v=|shorts\/|live\/))([^#&\?\s/]+)/;
  const match = trimmed.match(regExp);
  if (match && match[2] && match[2].length === 11) return match[2];

  const fallback = /^.*(?:&v=)([^#&\?\s]+)/.exec(trimmed);
  if (fallback && fallback[1] && fallback[1].length === 11) return fallback[1];

  return null;
}


export function isValidYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}
