# Progress Page

## Route

Route:

`/[locale]/progress`

Route file:

`src/app/[locale]/(dashboard)/progress/page.tsx`

## Current Behavior

The route redirects to `/`.

```text
ProgressPage
+-- redirect("/")
```

## Purpose

This is currently a compatibility or placeholder route. The dashboard sidebar treats `/progress` as active under the dashboard nav item, but no standalone progress UI is rendered.

## Related Code

`src/features/progress/progress-dashboard.tsx` exists, but this route does not use it.

## UI Rules

- Do not describe this route as an implemented progress dashboard until the redirect is removed.
- If a real progress page is restored, keep it under the dashboard shell and document its cards, charts, review metrics, and data source here.
