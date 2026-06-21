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
They should call feature hooks and feature-level client API helpers for data operations.

Client components may keep trivial event glue, but should not own:

- API response contract parsing.
- Non-trivial URL/query construction.
- Retry, cache, dedupe, or abort-controller policy shared across screens.
- Persistence decisions or ownership rules.
- Domain transformations that should be tested outside React rendering.

Examples:

- `src/features/study/ui/study-workspace-client.tsx`
- `src/features/study/ui/studio/chat/chat-panel.tsx`
- `src/features/upload/ui/upload-page-client.tsx`

Preferred browser-side data path:

```text
client component
  -> src/features/<feature>/hooks/use-*.ts
      -> src/features/<feature>/api-client/<feature>-client.ts
          -> /api route handler
```

## Route Handlers

Route handlers live under `src/app/api/**/route.ts`. They parse external input, authenticate when needed, call server modules, and return JSON or streams.

Streaming exception:

- `POST /api/study/studio/chat` returns an AI SDK UI message stream response.
