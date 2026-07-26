---
title: "Phase A: Dead-File Cleanup"
phase: a
status: pending
priority: P1
effort: 2h
dependencies: []
---

# Phase A: Dead-File Cleanup

## Overview

Pure deletion phase + a temporary rewrite of two broken files so the dev server compiles. After this lands, no orphan modules, no broken imports, and the navigation has no `/dictionary` link. Schema is **not** touched here (Phase E owns that).

## Requirements

- Functional
  - `src/app/api/translate/route.ts` returns `{ translation: "placeholder", type: null, provider: "fallback" }` with HTTP 200.
  - `src/features/reading/server/services/inline-translate.ts` exports `executeTranslate(input, ctx)` matching the route's call site.
  - Navigating to `/dictionary` returns 404.
  - The left navigation no longer links to "Từ điển".
- Non-functional
  - `pnpm typecheck && pnpm lint && pnpm knip` green.

## Architecture

- The route and the service both need to exist with the right exports so the broken imports compile. **Phase A only makes them compile**. They return placeholder strings. Phase C replaces both.
- `countWords` from the deleted `text-utils.ts` moves into `selection-utils.ts`. The two consumers (`selection-utils.ts` itself) need to be updated.

## Related Code Files

Refer to top-level **File Inventory** in `plan.md` for action+reason.

This phase owns:
- rewrite: `src/app/api/translate/route.ts` (temporary stub)
- rewrite: `src/features/reading/server/services/inline-translate.ts` (temporary stub)
- delete: `src/features/reading/server/db/inline-translate.ts`
- delete: `src/features/reading/server/db/translation.ts`
- delete: `src/features/reading/lib/text-utils.ts`
- modify: `src/features/reading/lib/selection-utils.ts`
- delete: `src/app/(dashboard)/dictionary/**`
- delete: `src/features/dictionary/**`
- modify: navigation/rail component

## Implementation Steps

1. Delete `src/features/reading/server/db/inline-translate.ts` and `src/features/reading/server/db/translation.ts` outright.
2. Delete `src/features/reading/lib/text-utils.ts`. Move `countWords` into `src/features/reading/lib/selection-utils.ts` (paste the regex + helper). Drop `TranslateResolutionSource` — nothing imports it.
3. Rewrite `src/features/reading/server/services/inline-translate.ts` as a stub:
   ```ts
   import "server-only";
   import type { TranslationDto } from "@/features/reading/schemas/translation";

   export async function executeTranslate(input: {
     text: string; sourceLanguage: "en" | "vi"; targetLanguage: "en" | "vi";
   }): Promise<{ ok: true; data: TranslationDto } | { ok: false; status: number }> {
     return {
       ok: true,
       data: { translation: "placeholder", type: null, ipa: null, provider: "fallback" },
     };
   }
   ```
4. Rewrite `src/app/api/translate/route.ts` as a stub:
   ```ts
   import { NextRequest } from "next/server";
   import { headers } from "next/headers";
   import { z } from "zod";
   import { auth } from "@/lib/auth/auth";
   import { executeTranslate } from "@/features/reading/server/services/inline-translate";

   const schema = z.object({
     text: z.string().min(1).max(50),
     context: z.string().min(1).max(2000),
     sourceId: z.string().uuid(),
     sourceLanguage: z.literal("en"),
     targetLanguage: z.literal("vi"),
   });

   export async function POST(req: NextRequest) {
     const session = await auth.api.getSession({ headers: await headers() });
     if (!session) return Response.json({ error: "Authentication required" }, { status: 401 });
     const input = schema.parse(await req.json());
     const result = await executeTranslate(input);
     if (!result.ok) return Response.json({ error: "Not found" }, { status: result.status });
     return Response.json(result.data);
   }
   ```
   The route still parses Zod, validates auth, and calls the service. Only the response shape is placeholder.
5. Delete `src/app/(dashboard)/dictionary/` (if any strays) and `src/features/dictionary/` (if any strays).
6. Open the navigation/rail component, remove the `Từ điển` entry and the unused `Languages` icon import.
7. `pnpm knip` → fix any unused exports.

## Success Criteria

- [ ] `pnpm typecheck && pnpm lint && pnpm knip` all green.
- [ ] `curl -X POST /api/translate -H 'cookie: …' -d '{…}'` returns HTTP 200 with `{ translation: "placeholder", type: null, ipa: null, provider: "fallback" }`.
- [ ] `ls src/features/dictionary src/features/reading/server/db 2>&1` returns "No such file or directory" for `dictionary` and shows no `inline-translate.ts` / `translation.ts`.
- [ ] Selecting text in the study page shows no popup yet (popup wiring is Phase B). The app loads the study page without errors.

## Risk Assessment

- If `selection-utils.ts` calls `countWords` from `text-utils.ts` and we delete `text-utils.ts` first, the file won't compile. Do the `selection-utils.ts` modification in the same commit as the `text-utils.ts` deletion.
- Navigation rail change: if the rail is shared across multiple routes, confirm no other route depends on the `/dictionary` link being present.

## Security Considerations

- The route still requires auth and validates Zod; no relaxation.
- The placeholder service is server-only (`import "server-only"`).