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

### Phase 4: React Router + Vite and Nitro (2026-09-28)

Same machine. `pnpm dev` now runs `react-router dev` (3000) and `nitro dev`
(3001) under `concurrently`. The first `/study` load is timed differently
from the baseline, and it is the stricter measure. Instead of one `curl`, a
headless Chromium loads `/study` until the page settles. That load includes
Vite's dependency optimization, every module the page imports, Chromium's own
startup, and the client redirect to the login form. The baseline `curl` only
waited for Next's server compile.

| Run | Ready | First `/study` (browser) | `/login` | Re-request after edit | Peak RSS (tree) |
|---|---|---|---|---|---|
| Cold 1 | 991 ms | 3.8 s | 25 ms | 28 ms | 1970 MB |
| Cold 2 | 992 ms | 3.7 s | 14 ms | 25 ms | 2153 MB |
| Cold 3 | 990 ms | 4.4 s | 19 ms | 17 ms | 2152 MB |
| **Cold median** | **991 ms** | **3.8 s** | **19 ms** | **25 ms** | **2152 MB** |
| Warm median (3 runs) | 1117 ms | 3.4 s | 17 ms | 28 ms | 1308 MB |

- "Cold" deletes the Vite dependency cache and `.nitro` before each run.
- "Ready" is when both servers are listening.
- "Re-request after edit" appends a comment to `studio-panel.tsx` and times
  Vite serving the changed module. It is still a server-side proxy for HMR.

`pnpm build` (`prisma generate` + `react-router build` + `nitro build`):

| Run | Wall time | Peak RSS (largest process) |
|---|---|---|
| 1 | 7.4 s | 1092 MB |
| 2 | 8.2 s | 1007 MB |
| 3 | 7.8 s | 1048 MB |
| **Median** | **7.8 s** | **1048 MB** |

**Compared with Next:**

| Metric | Next | Now |
|---|---|---|
| First `/study`, cold | 17.0 s | 3.8 s, about 4.5× faster, and this figure includes browser work the baseline left out |
| Warm start | 4.9 to 22.7 s, erratic | 3.4 s, steady |
| Re-request after an edit | 462 ms | 25 ms |
| Peak dev memory | 2854 MB | 2152 MB cold, 1308 MB warm |
| Build | 36.3 s | 7.8 s |
