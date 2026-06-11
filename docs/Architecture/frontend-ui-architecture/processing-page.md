# Processing Page

## Route

Route:

`/[locale]/processing`

Route file:

`src/app/[locale]/(dashboard)/processing/page.tsx`

Root client:

`src/features/upload/ui/processing-page-client.tsx`

## Purpose

Transitional processing screen shown after upload-style workflows. It simulates analysis progress and redirects when complete.

## Layout

```text
ProcessingPageClient
+-- Suspense boundary
    +-- Centered progress panel
        +-- Spinning RefreshCw icon
        +-- Stage heading
        +-- Helper copy
        +-- Progress bar
        +-- Percent text
```

## State And Routing

The client reads:

- `contentId`
- `filename`

It advances through timed stages:

- analyzing
- simplifying, rendered as analyzing
- generating
- complete

After completion, it redirects to `/study`.

## UI Rules

- Keep this screen simple and transitional.
- Do not add long-form explanations or secondary navigation.
- If this becomes a real job-status page, replace simulated timers with durable backend status.
