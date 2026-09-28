---
phase: 4
title: "Tooling Cleanup"
status: pending
priority: P2
effort: "0.5d"
dependencies: [3]
---

# Phase 4: Tooling Cleanup

## Goal

Remove every Next dependency and config, and make scripts, lint, types, knip,
and env naming match the new stack.

## Tasks & Steps

1. `package.json`:
   - Remove `next`, `eslint-config-next`, `server-only`, `@tailwindcss/postcss`.
   - Scripts: `dev` → run `react-router dev` and `nitro dev --port 3001`
     together (one small dev dependency such as `concurrently`); `build` →
     `prisma generate --generator client && react-router build && nitro build`
     (the `react-router` CLI, not `vite build`, which hangs after prerender);
     `start` → `NODE_ENV=production node .output/server/index.mjs` (without it the logger loads pino-pretty and the worker crashes); keep `typecheck`, `lint`,
     `postinstall`, `db:generate`, `workflow:inspect`.
2. Delete `next.config.ts`, `src/proxy.ts`, `next-env.d.ts` (if present), `.next/` from `.gitignore` → add `build/`, `.output/`, `.nitro/`, `.react-router/`.
3. `tsconfig.json`: drop the `next` plugin and `.next/types` includes; add
   `.react-router/types/**/*` and `rootDirs` per React Router typegen; add
   `"types": ["vite/client"]`; add the `workflow` TS plugin.
4. `eslint.config.mjs`: replace `eslint-config-next` with `typescript-eslint`
   recommended, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`; keep
   the existing `no-unused-vars` rule and `src/generated/**` ignore.
5. `knip.json`: replace `"next": true` with the React Router / Vite plugins and
   add `src/server/app.ts` as an entry.
6. Env: remove `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DISABLED`,
   `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` from local `.env*` files
   and the Vercel project env (ask the user before changing Vercel settings).
   `.env.example` has no Sentry keys today.
7. `components.json` (shadcn): set `"rsc": false` and update the Tailwind
   config path if it referenced PostCSS.

## Files

- Modify: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `eslint.config.mjs`, `knip.json`, `.gitignore`, `components.json`
- Delete: `next.config.ts`, `src/proxy.ts`, `next-env.d.ts`

## Todo

- [ ] Next packages removed, scripts updated
- [ ] Next config files deleted, `.gitignore` updated
- [ ] tsconfig, ESLint, knip reconfigured
- [ ] Sentry env vars removed locally and on Vercel

## Verification

- `pnpm install && pnpm typecheck && pnpm lint && pnpm build` pass.
- `pnpm knip` reports no new unused files or deps from the migration.
- `grep -rn "NEXT_PUBLIC\|next/" src` returns nothing.
- Dev performance: repeat the Phase 1 measurements and append them to the baseline report; cold start and HMR must be faster.

## Rollback

Revert the phase commit; configs and dependencies return.
