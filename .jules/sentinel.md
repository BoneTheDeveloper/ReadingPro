## 2024-05-21 - Open Redirect Bypass via `/\` Path Prefix
**Vulnerability:** The `getSafeNextPath` helper in `src/lib/auth/redirects.ts` used `startsWith("//")` to block protocol-relative URLs. However, a bypass was possible by using `/\example.com`, which some browsers (like Chrome) normalize to `//example.com`, allowing open redirects.
**Learning:** Browsers are extremely lenient with path slashes and backslashes in URLs. When validating safe local paths, you must account for backslashes that could be normalized into forward slashes for protocol-relative paths.
**Prevention:** In addition to checking for `//`, validate that paths do not begin with `/\\` (or backslashes in general). Ensure paths strictly start with `/` and don't use backslash as the second character.
