# Baseline: Next.js dev and build performance

Measured 2026-09-28 on the current Next app, before migration. This is the
reference for the plan's "dev cold start and HMR are measurably faster"
criterion (`plans/260928-0623-migrate-next-to-react-router-vite/plan.md`).

## Summary

Opening `/study` for the first time after `pnpm dev` takes about **17 s** (median of
3 cold runs). Next's own compile accounts for 13.5 s of that. The dev process
tree peaks at about **2.8 GB** of RAM. The dev server itself reports "Ready" in
under 1 s, so all of the waiting happens on the first request. `pnpm build` takes about 36 s.

## Environment

- Linux (Fedora, kernel 7.2), 8 cores, 7 GB RAM
- Node 24.21.0, pnpm 12.3.4, Next.js 16.2.12 with Turbopack (`next dev --turbopack`)
- No browser attached; requests made with `curl` against `localhost:3000`
- Signed out, so `/study` answers `307 → /login` after compiling the route

## Dev server, cold (build cache deleted before each run)

| Run | "Ready in" | First `/study` (wall) | Next-reported `/study` | First `/login` | Re-request after edit | Peak RSS (tree) |
|---|---|---|---|---|---|---|
| 1 | 681 ms | 15.4 s | 12.3 s (next.js 10.9 s + app 1.5 s) | 2.5 s | 462 ms | 2597 MB |
| 2 | 818 ms | 19.3 s | 15.3 s (next.js 14.1 s + app 1.3 s) | 1.4 s | 156 ms | 2859 MB |
| 3 | 456 ms | 17.0 s | 13.5 s (next.js 12.2 s + app 1.3 s) | 2.2 s | 483 ms | 2854 MB |
| **Median** | **681 ms** | **17.0 s** | **13.5 s** | **2.2 s** | **462 ms** | **2854 MB** |

"First `/study` (wall)" runs from the moment Next prints "Ready" until the request is logged. "Next-reported" is
the time Next itself prints in the log line (`GET /study 307 in …`).

## Dev server, warm (build cache kept from the previous run)

| Run | First `/study` (wall) | Next-reported `/study` | Peak RSS |
|---|---|---|---|
| 1 | 18.7 s | 14.5 s | 2713 MB |
| 2 | 22.7 s | 18.1 s | 2818 MB |
| 3 | 4.9 s | 1.5 s | 1889 MB |

The Turbopack filesystem cache helped only once in 3 runs. The benchmark
stops the server with SIGTERM and falls back to SIGKILL, so the cache is probably not always
flushed. In daily use, restarts are likely to behave like cold starts often.

## Production build (`pnpm build`, includes `prisma generate`)

| Run | Wall time | Peak RSS (largest process) |
|---|---|---|
| 1 | 36.6 s | 1958 MB |
| 2 | 36.3 s | 2042 MB |
| 3 | 34.5 s | 2052 MB |
| **Median** | **36.3 s** | **2042 MB** |

Run 1 breakdown: compile 20.9 s, TypeScript 8.3 s, and 18 static pages in 0.6 s.

## Limitations

- **HMR is not measured in a browser.** No headless browser is installed. The
  "re-request after edit" column appends a comment to
  `src/features/studio/component/panel/studio-panel.tsx`, then times the next
  `/study` request. Signed out, the layout redirects before the studio renders,
  so this number is a server-side invalidation proxy, not real HMR latency.
  After the migration, repeat the same proxy measurement, and measure browser
  HMR if a browser becomes available.
- Peak dev RSS is the sum over the `pnpm dev` process group, sampled every
  100 ms. Peak build RSS comes from `/usr/bin/time -v`, which reports the
  single largest process.

## Method

Scripts are in the session scratchpad and are not committed:

- **Dev runs:** delete the build cache (cold runs only), then start `pnpm dev` under `setsid`.
  - Wait for "Ready in".
  - `curl /study`, then `curl /login`.
  - Edit the studio panel, `curl /study`, then restore the file.
  - Stop the process group.
- **Build runs:** `/usr/bin/time -v pnpm build`, three runs in a row.

## Post-migration results

To be appended in Phases 4 and 5 using the same method.
