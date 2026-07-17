/**
 * YouTube URL utilities - shared between client and server.
 * Pure functions with no external dependencies.
 */

/**
 * Extract video ID from YouTube URL.
 * Supports: youtube.com, youtu.be, shorts, live
 */
export function extractVideoId(url: string): string | null {
  const regex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Validate YouTube URL format.
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}
