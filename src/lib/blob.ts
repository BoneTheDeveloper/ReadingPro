/**
 * Build a URL for the authenticated blob source route.
 * The route streams the file with ownership enforcement on the server side.
 */
export function getViewableUrl(pathname: string): string {
  return `/api/blob?pathname=${encodeURIComponent(pathname)}`;
}
