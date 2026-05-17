## 2024-05-18 - [Add Security Headers]
**Vulnerability:** Missing strict HTTP response security headers out of the box in `next.config.ts`, rendering the app potentially vulnerable to clickjacking, mime-sniffing attacks, and missing out on DNS prefetching controls.
**Learning:** Found that `next.config.ts` was not enforcing basic defense-in-depth security headers like `X-Frame-Options` and `X-Content-Type-Options`.
**Prevention:** Ensured the configuration defines default strict `headers()` applying `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and others.
