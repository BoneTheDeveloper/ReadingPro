## 2026-05-27 - Security Hardening: Content Security Policy (CSP) added
**Vulnerability:** The application was missing a Content-Security-Policy (CSP) header, which is an important defense-in-depth measure against Cross-Site Scripting (XSS) and other data injection attacks.
**Learning:** Added a basic CSP policy to Next.js's headers block. While `unsafe-inline` was kept for styles and scripts due to Next.js requirements, we successfully tightened `object-src`, `frame-ancestors`, and explicitly listed allowed domains (Supabase, Sentry, Google Fonts).
**Prevention:** Consider implementing strict nonces in a future iteration for `script-src` and `style-src` to eliminate `unsafe-inline` entirely and improve XSS protection.
