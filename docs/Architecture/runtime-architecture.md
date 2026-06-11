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
They should call feature hooks, server actions, or feature-level client API helpers for data operations.

Client components may keep trivial event glue, but should not own:

- API response contract parsing.
- Non-trivial URL/query construction.
- Retry, cache, dedupe, or abort-controller policy shared across screens.
- Persistence decisions or ownership rules.
- Domain transformations that should be tested outside React rendering.

Examples:

- `src/features/study/ui/study-workspace-client.tsx`
- `src/features/study/ui/studio/chat/chat-panel.tsx`
- `src/features/upload/upload-page-client.tsx`
- `src/features/dictionary/dictionary-page-client.tsx`

Preferred browser-side data path:

```text
client component
  -> src/features/<feature>/use-*.ts or <feature>-api.ts
      -> /api route or server action
```

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
- Browser fetch logic that is reused, contract-sensitive, or non-trivial should live in feature hooks/client API helpers rather than directly in components.
- Route handlers and server actions must validate all external input with Zod or equivalent guards.
- Shared logic belongs in `src/lib/` only when reused across features or route surfaces.
- Use path aliases from `@/` consistently.
