/**
 * YouTube URL utilities - shared between client and server.
 * Pure functions with no external dependencies.
 */

/**
 * Extract video ID from YouTube URL.
 * Supports: youtube.com, m.youtube.com, youtu.be, /shorts/, /live/, /embed/, /watch?v=.
 * Trailing whitespace, locale hosts (e.g. youtube.com.vn), and extra params
 * (e.g. ?si=, &t=) are tolerated.
 */
export function extractVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // First try the structural markers — covers watch?v=, youtu.be/, /embed/, /shorts/, /live/, and /v/.
  const regExp = /^.*(youtu\.be\/|youtube(?:\.googleapis)?\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|live\/)|m\.youtube\.com\/(?:watch\?v=|shorts\/|live\/))([^#&\?\s/]+)/;
  const match = trimmed.match(regExp);
  if (match && match[2] && match[2].length === 11) return match[2];

  // Fallback: support /user/ uploads &v= and other &v= forms not preceded by a slash.
  const fallback = /^.*(?:&v=)([^#&\?\s]+)/.exec(trimmed);
  if (fallback && fallback[1] && fallback[1].length === 11) return fallback[1];

  return null;
}

/**
 * Validate YouTube URL format.
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}
