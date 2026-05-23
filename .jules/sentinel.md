
## 2024-05-27 - Host Header Injection / Open Redirect in Auth Callback
**Vulnerability:** The application used `x-forwarded-host` to determine the callback origin after authentication, leading to Open Redirect and potentially leaking auth codes.
**Learning:** Next.js automatically handles secure origins when configured correctly behind a proxy or Vercel, so reading `x-forwarded-host` manually bypasses the framework's trusted security boundaries.
**Prevention:** Do not rely on unvalidated proxy headers like `x-forwarded-host`. Stick strictly to `request.url` parsed values (like `origin`) which are inherently validated or proxy-trusted by the framework.
