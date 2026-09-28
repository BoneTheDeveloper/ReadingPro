# Spike: Vite + Nitro layout for the React Router SPA

Run 2026-09-28 in a throwaway `spike/` folder for Phase 1 of
`plans/260928-0623-migrate-next-to-react-router-vite/plan.md`.

## Decision

Use **layout B**. The frontend (React Router SPA built by Vite) and the backend
(Hono + Workflow SDK built by Nitro) have separate configs and separate
commands. In dev, Vite proxies `/api` to Nitro. In production, Nitro serves the
React Router client output as public assets and uses `__spa-fallback.html` as
the catch-all. Every piece follows a documented setup, and all checks below
passed.

Layout A (React Router and `nitro/vite` in one Vite config) is rejected. The
only official example of that pairing is SSR (`ssr: true`,
[nitrojs/nitro `examples/vite-ssr-react-router`](https://github.com/nitrojs/nitro/tree/main/examples/vite-ssr-react-router)).
Nothing documents it for SPA mode. In the spike, dev worked, but `vite build`
failed: React Router prerenders through `vite preview` inside
`builder.buildApp`, and that runs before Nitro's `buildApp` hook has produced
a server build.

## Versions

React Router 8.4.0 (the plan said v7; v8 is current), Vite 8.3.1, Nitro
3.0.260903-beta, Hono 4.13.9, Workflow SDK 4.8.9, Tailwind 4.3.3, Node 24.21.0.

## Config that worked

`react-router.config.ts`

```ts
export default {
  ssr: false,
  prerender: ["/"],
  buildDirectory: "build",
} satisfies Config;
```

`vite.config.ts` (no Nitro plugin)

```ts
export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  server: { proxy: { "/api": "http://localhost:3001" } },
});
```

`nitro.config.ts`

```ts
export default defineConfig({
  // Without this, `nitro build` detects vite.config.ts, switches to the Vite
  // builder, and rebuilds (and empties) the React Router client output.
  builder: "rolldown",
  modules: ["workflow/nitro"],
  routes: { "/api/**": "./server/app.ts" },
  $production: {
    publicAssets: [{ dir: "./build/client", baseURL: "/" }],
    renderer: { template: "./build/client/__spa-fallback.html", static: true },
  },
});
```

`server/app.ts` is a plain Hono app with `basePath("/api")`, exported as the
default export. Workflows are ordinary `"use workflow"` / `"use step"` files
started with `start()` from `workflow/api`.

Scripts:

```json
"dev:web": "react-router dev --port 3000 --strictPort",
"dev:api": "nitro dev --port 3001",
"build:web": "react-router typegen && react-router build",
"build:api": "nitro build",
"start": "node .output/server/index.mjs"
```

## Results

| Check | Result |
|---|---|
| Dev: `/` through Vite | 200, prerendered landing content |
| Dev: `/study` through Vite | 200, SPA shell (`HydrateFallback`) |
| Dev: `/api/ping` on 3001 and through the 3000 proxy | both answer |
| Dev: workflow through the proxy | `completed`, result `spike:one:two` |
| Dev: streamed response through the proxy | 4 chunks arrive 0.5 s apart, not buffered |
| `react-router build` | 11 s, exits on its own, writes `index.html` and `__spa-fallback.html` |
| `NITRO_PRESET=vercel nitro build` | exit 0 in 3 s; `.vercel/output/static` has `index.html`, `__spa-fallback.html`, `assets/`; one function `__server.func`; client output left intact |
| `NITRO_PRESET=node-server nitro build` | exit 0 in 1 s; `.output/public` has the same files |
| node-server: `/` | 200, prerendered landing content |
| node-server: `/study` (deep link) | 200, SPA fallback |
| node-server: `/assets/*.js` | 200, `text/javascript` |
| node-server: `/api/ping` | answers |
| node-server: unknown `/api/nope` | 404 from Hono, not the SPA fallback |
| node-server: workflow (local world) | `completed` |
| node-server: streamed response | 4 chunks arrive 0.5 s apart |

## Findings to carry into the plan

- **Use the `react-router build` CLI, not `vite build`.** `vite build` with
  only `reactRouter()` hangs after prerendering, because native `fs.watch`
  handles stay open. `react-router build` exits normally. The hang is not a
  risk once the scripts use the CLI.
- **Pin `builder: "rolldown"` in `nitro.config.ts`.** When `builder` is
  unset, Nitro auto-detects it. If it sees `vite.config.ts`, it picks the Vite
  builder, reruns React Router, and empties `build/client`.
- **Static assets have no `cache-control` header** on node-server. Set
  `maxAge` on the `publicAssets` entry, or add a `routeRules` header for
  `/assets/**`, so hashed assets stay immutable as they are on Next today.
- **Nitro v3 is beta.** Pin the exact version.
- **Keep `better-auth` on the browser origin (3000).** The Vite proxy is what
  makes the dev origin stable.

## Vercel output

`.vercel/output/config.json` routes the Workflow SDK endpoints
(`/.well-known/workflow/v1/{flow,step,webhook}`) to their own functions, then
`handle: filesystem` (so `/` is served from `static/index.html`), then
everything else to `__server`, which answers `/api/**` and the SPA fallback.
`__server.func` runs `nodejs24.x` with `supportsResponseStreaming: true`.

## Not verified here

- A real Vercel deploy (Phase 5).
- Browser HMR timing. No browser is available; Phase 4 repeats the baseline
  method.
