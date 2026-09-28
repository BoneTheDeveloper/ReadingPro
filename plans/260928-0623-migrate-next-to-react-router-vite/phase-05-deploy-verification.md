---
phase: 5
title: "Deploy Verification"
status: pending
priority: P1
effort: "1d"
dependencies: [4]
---

# Phase 5: Deploy Verification

## Goal

Ship the branch to a Vercel preview in `sin1`, verify every acceptance
criterion there, and prove the `node-server` build boots locally so the later
move off Vercel needs config only.

## Context

- `vercel.json` has `regions: ["sin1"]` and `git.deploymentEnabled: false`, so
  deploys are manual (`vercel deploy`).
- Nitro `vercel` preset emits Build Output API v3; Vercel should detect it
  without a framework preset. Confirm the project's Framework Preset is "Other".
- Workflows on Vercel use the Vercel World automatically. Postgres World is not
  compatible with Vercel and stays out of scope.

## Tasks & Steps

1. Ask the user before changing the Vercel project settings (framework preset,
   build command, output directory, Sentry env removal from Phase 4).
2. `NITRO_PRESET=vercel pnpm build` locally; inspect `.vercel/output/config.json`
   for routes, headers, and the functions region, and confirm
   `.vercel/output/static/` holds `index.html` and `__spa-fallback.html`.
3. Deploy a preview with `vercel deploy` (not `--prod`).
4. Run the acceptance checks on the preview URL:
   - `curl -sI <preview>/` shows CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`;
   - `curl -s <preview>/ | grep "Tóm tắt văn bản"` finds prerendered copy;
   - `curl -sI <preview>/api/passage` → 401 with the same headers;
   - a deep link such as `curl -s <preview>/study` returns the SPA fallback HTML (200), not a 404;
   - Google sign-in through `oAuthProxy` on the preview domain;
   - create a passage (text, PDF upload, YouTube) → COMPLETED; generate flashcard + question → COMPLETED (check `pnpm workflow:inspect`);
   - AI chat streams incrementally; history persists;
   - expired session → toast + single redirect to `/login`;
   - a forced server error appears in Vercel runtime logs as a pino JSON line with `route` and `requestId`;
   - no browser request goes to `*.sentry.io` or `/monitoring`.
5. Node portability check: `NITRO_PRESET=node-server pnpm build`, run
   `node .output/server/index.mjs` with local env, and hit `/`, `/login`,
   `/api/passage`, `/api/auth/get-session`. Workflows are not tested here
   (they need Postgres World, which is the later hosting plan).
6. Append final dev performance numbers and preview findings to the baseline report.
7. Ask the user before promoting to production.

## Todo

- [ ] Vercel project settings confirmed with the user
- [ ] Preview deployed from the branch
- [ ] All preview acceptance checks pass
- [ ] node-server build boots and serves pages and API
- [ ] Results appended to the report

## Success Criteria

All items in `plan.md` Success Criteria are checked with evidence in
`plans/reports/baseline-260928-next-dev-performance.md`.

## Risks

- Vercel still detects Next and runs `next build` → set Framework Preset to "Other" and build command to `pnpm build`.
- Function timeout on long AI generation → unchanged from today because workflows run as steps; long-running chat streams are the reason for the later hosting move.

## Rollback

Production is untouched until the user promotes. Discard the preview deployment.
