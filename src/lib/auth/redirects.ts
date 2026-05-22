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
  if (!next || !next.startsWith("/")) {
    return fallback;
  }

  // Prevent protocol-relative URLs and various backslash bypasses
  // Next path must strictly start with "/" and not be followed by "/" or "\"
  const normalized = decodeURIComponent(next);
  if (normalized.startsWith("//") || normalized[1] === "\\" || normalized.startsWith("/\\")) {
    return fallback;
  }

  return next;
}
