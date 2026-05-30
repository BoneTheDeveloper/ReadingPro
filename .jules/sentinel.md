## 2026-05-27 - Security Hardening: Content Security Policy (CSP) added
**Vulnerability:** The application was missing a Content-Security-Policy (CSP) header, which is an important defense-in-depth measure against Cross-Site Scripting (XSS) and other data injection attacks.
**Learning:** Added a basic CSP policy to Next.js's headers block. While `unsafe-inline` was kept for styles and scripts due to Next.js requirements, we successfully tightened `object-src`, `frame-ancestors`, and explicitly listed allowed domains (Supabase, Sentry, Google Fonts).
**Prevention:** Consider implementing strict nonces in a future iteration for `script-src` and `style-src` to eliminate `unsafe-inline` entirely and improve XSS protection.

## 2026-05-29 - Security Hardening: Prevented Host Header Injection / Open Redirect
**Vulnerability:** The application derived the redirect origin in `src/app/auth/callback/route.ts` from the request URL's origin, which is vulnerable to Host Header Injection. Attackers could manipulate the `Host` header to redirect authenticated sessions to external malicious domains.
**Learning:** Relying on the dynamic request origin for authentication callbacks can lead to open redirects. Statically defined environment variables are a much more secure way to enforce absolute redirect limits.
**Prevention:** Use a statically defined environment variable like `process.env.NEXT_PUBLIC_SITE_URL` when constructing absolute redirect URLs, falling back to the request origin only if necessary.
