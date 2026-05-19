export function normalizeOrigin(origin: string | undefined) {
  if (!origin) {
    return undefined;
  }

  const trimmed = origin.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return undefined;
  }

  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

export function getBrowserRedirectOrigin() {
  return window.location.origin;
}

export function getSafeNextPath(next: string | null, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  return next;
}
