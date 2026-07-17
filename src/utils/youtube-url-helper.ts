/**
 * YouTube URL utilities - shared between client and server.
 * Pure functions with no external dependencies.
 */

/**
 * Extract video ID from YouTube URL.
 * Supports: youtube.com, youtu.be, shorts, live
 */
export function extractVideoId(url: string): string | null {
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Validate YouTube URL format.
 */
export function isValidYouTubeUrl(url: string): boolean {
  if (!url || url.trim().length === 0) {
    return false;
  }

  return extractVideoId(url) !== null;
}
