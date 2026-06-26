## 2026-05-27 - Security Hardening: Content Security Policy (CSP) added
**Vulnerability:** The application was missing a Content-Security-Policy (CSP) header, which is an important defense-in-depth measure against Cross-Site Scripting (XSS) and other data injection attacks.
**Learning:** Added a basic CSP policy to Next.js's headers block. While `unsafe-inline` was kept for styles and scripts due to Next.js requirements, we successfully tightened `object-src`, `frame-ancestors`, and explicitly listed allowed domains (Supabase, Sentry, Google Fonts).
**Prevention:** Consider implementing strict nonces in a future iteration for `script-src` and `style-src` to eliminate `unsafe-inline` entirely and improve XSS protection.

## 2026-05-29 - Security Hardening: Prevented Host Header Injection / Open Redirect
**Vulnerability:** The application derived the redirect origin in `src/app/auth/callback/route.ts` from the request URL's origin, which is vulnerable to Host Header Injection. Attackers could manipulate the `Host` header to redirect authenticated sessions to external malicious domains.
**Learning:** Relying on the dynamic request origin for authentication callbacks can lead to open redirects. Statically defined environment variables are a much more secure way to enforce absolute redirect limits.
**Prevention:** Use a statically defined environment variable like `process.env.NEXT_PUBLIC_SITE_URL` when constructing absolute redirect URLs, falling back to the request origin only if necessary.

## 2025-02-14 - [Stored XSS via File Upload MIME Type Bypass]
**Vulnerability:** The file upload handler blindly trusted the client-provided `file.type` for storing files in Supabase Storage, even when falling back to extension-based validation. An attacker could upload a file named `evil.txt` with a `Content-Type: text/html`, which would be stored and served by the CDN as `text/html`, leading to a Stored Cross-Site Scripting (XSS) vulnerability.
**Learning:** Even if a file's extension validates successfully as a safe file type (like `.txt`), the user-provided MIME type from the upload request must not be trusted or passed directly to the storage provider.
**Prevention:** Always derive the MIME type used for object storage directly from the validated and sanitized file extension or strictly allow-listed content analysis, rather than trusting the incoming `Content-Type` header or `File.type` property.

## 2026-06-03 - Security Hardening: Prevented Host Header Injection in Middleware Redirects
**Vulnerability:** The Next.js middleware (`src/proxy.ts`) used `request.url` to construct absolute redirect URLs for unauthenticated users accessing protected routes. This approach is vulnerable to Host Header Injection, where an attacker can spoof the `Host` header to execute Open Redirects or phishing attacks.
**Learning:** Next.js provides `request.nextUrl`, which safely parses trusted forwarded headers (e.g., `x-forwarded-host`, `x-forwarded-proto`) and mitigates spoofing. Using `request.nextUrl.clone()` is the correct and safest way to perform URL mutations within Next.js middleware, preventing both host header injection and accidental loss of Next.js state like `basePath`.
**Prevention:** Never use raw `request.url` to construct redirects in middleware. Always utilize `request.nextUrl` to ensure safe host resolution and preserve expected application behavior across environments.
