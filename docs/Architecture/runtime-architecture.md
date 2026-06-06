# Runtime Architecture

## Next.js Runtime

The app uses Next.js App Router with locale-prefixed routes:

```text
src/app/
  layout.tsx
  global-error.tsx
  [locale]/
    layout.tsx
    (auth)/
    (dashboard)/
  api/
```

`src/proxy.ts` is the front-door middleware boundary. It handles Clerk route protection and delegates locale handling to next-intl.

## Server Components

Pages should remain Server Components unless they need browser interactivity. Server Components are responsible for loading authenticated data and passing serializable props to feature clients.

Examples:

- Dashboard pages under `src/app/[locale]/(dashboard)`.
- Reading and test route pages that load owned passage data.

## Client Components

Client components own browser state, panels, selection, chat UI, upload drag/drop, and interactions.

Examples:

- `src/features/study/study-page-client.tsx`
- `src/features/study/study-chat-panel.tsx`
- `src/features/upload/upload-page-client.tsx`
- `src/features/dictionary/dictionary-page-client.tsx`

## Route Handlers

Route handlers live under `src/app/api/**/route.ts`. They parse external input, authenticate when needed, call services/repositories, and return JSON or streams.

Streaming exception:

- `POST /api/study-chat` returns an AI SDK UI message stream response.

## Server Actions

Server actions live with features:

- `src/features/study/actions/*`
- `src/features/upload/analyze-content-action.ts`

Server actions must authenticate and enforce ownership before reads/writes.

## Runtime Boundary Rules

- Browser code must not import Prisma, Clerk server APIs, filesystem, or server-only AI modules.
- Route handlers and server actions must validate all external input with Zod or equivalent guards.
- Shared logic belongs in `src/lib/` only when reused across features or route surfaces.
- Use path aliases from `@/` consistently.

