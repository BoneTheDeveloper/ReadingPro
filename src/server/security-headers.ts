// Applied to every response (HTML, static assets, API) through Nitro routeRules.
export function securityHeaders(isDev: boolean): Record<string, string> {
  const csp = {
    defaultSrc: "default-src 'self'",
    scriptSrc: [
      "script-src 'self' 'unsafe-inline'",
      isDev ? "'unsafe-eval'" : "",
      "https://va.vercel-scripts.com",
      "https://challenges.cloudflare.com",
      // Google Identity Services (Better Auth One Tap).
      "https://accounts.google.com",
      "https://apis.google.com",
    ]
      .filter(Boolean)
      .join(" "),
    styleSrc: "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
    imgSrc: "img-src 'self' blob: data: https://lh3.googleusercontent.com https://accounts.google.com",
    fontSrc: "font-src 'self' https://fonts.gstatic.com",
    connectSrc: [
      "connect-src 'self'",
      isDev ? "http://localhost:*" : "",
      isDev ? "ws://localhost:*" : "",
      "https://vitals.vercel-insights.com",
      "https://accounts.google.com",
      "https://*.blob.vercel-storage.com",
    ].filter(Boolean).join(" "),
    objectSrc: "object-src 'none'",
    baseUri: "base-uri 'self'",
    formAction: "form-action 'self'",
    frameAncestors: "frame-ancestors 'self'",
    frameSrc: "frame-src 'self' https://challenges.cloudflare.com https://www.youtube.com https://youtube.com https://accounts.google.com",
    workerSrc: "worker-src 'self' blob:",
    upgradeInsecure: "upgrade-insecure-requests",
  };

  return {
    "Content-Security-Policy": Object.values(csp).join("; "),
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}
