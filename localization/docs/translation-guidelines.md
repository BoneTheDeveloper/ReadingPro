# Translation Guidelines

## Overview

Translations are stored as JSON catalogs in `localization/messages/en.json` and `localization/messages/vi.json`. English is the source language and Vietnamese mirrors the same key structure. The app uses `next-intl`, so message keys, placeholders, and rich text patterns should stay compatible with next-intl message formatting.

## Catalog Rules

- Keep `localization/messages/en.json` and `localization/messages/vi.json` structurally identical.
- Add new copy to the smallest relevant namespace instead of creating one-off top-level groups.
- Prefer stable semantic keys over wording-based keys, for example `uploadFirstReading` instead of `uploadYourFirstReadingNow`.
- Keep placeholders identical across locales.
- Do not translate keys, enum values, route segments, file names, database values, or API payload names.
- Do not put user-generated reading content into message catalogs.

## Namespace Ownership

| Namespace | Add keys here when copy belongs to |
|-----------|------------------------------------|
| `Common` | Shared labels reused across unrelated features. |
| `Navigation` | Route labels, sidebar labels, global navigation actions. |
| `Auth` | Sign-in, sign-up, OAuth, and account access flows. |
| `Dashboard` | Dashboard-only metrics, cards, next-action copy, and empty states. |
| `Study` | Study workspace, upload flow, source list, quiz, generated results, and study actions. |
| `Reading` | Reading view labels and passage metadata. |
| `Test` | Flashcard test page and answer review UI. |
| `Progress` | Progress metrics and study history UI. |
| `Errors` | Error boundaries, not-found states, and retry copy. |

## Placeholder Rules

Placeholders must use the same names in every locale.

```json
{
  "welcomeBack": "Welcome back, {name}.",
  "mature": "{percent}% mature",
  "wordCount": "{count} words"
}
```

Vietnamese must keep the same placeholder tokens:

```json
{
  "welcomeBack": "Chao tro lai, {name}.",
  "mature": "{percent}% da thanh thao",
  "wordCount": "{count} tu"
}
```

Use placeholders for user names, counts, dates, file sizes, CEFR levels, and dynamic passage titles. Avoid string concatenation in UI components when a full sentence needs grammar changes per language.

## Tone And Terminology

| English | Vietnamese | Notes |
|---------|------------|-------|
| Reading | Bai doc | Use for saved passages and reading material. |
| Study | Hoc | Use for the study workspace and learning actions. |
| Flashcards | The ghi nho | Use for review cards. |
| Source | Nguon | Use for uploaded or pasted content sources. |
| Quiz/Test | Cau hoi/Kiem tra | Use `Cau hoi` inside study quiz UI and `Kiem tra` for the test page. |
| Progress | Tien do | Use for metrics and history. |

Vietnamese UI should be natural and concise. Prefer familiar product language over literal word-by-word translation. Preserve app/product names such as `ReadingPro`.

## Formatting Guidance

- Use locale-aware formatters for numbers, dates, and relative time when rendering user-visible values.
- Avoid hard-coded `"en"` in `Intl.DateTimeFormat` unless the value intentionally represents English learning content.
- Avoid manual plural helpers for full UI strings. Prefer message placeholders or ICU plural syntax when the grammar differs by locale.
- Keep CEFR labels such as `A1`, `B2`, and `CEFR {level}` unchanged.
- Keep file types and limits readable in both languages, for example `.txt, .pdf - max {size}`.

## Implementation Pattern

Use a namespace when a component is feature-scoped:

```tsx
const t = useTranslations("Study");
t("uploadText");
```

Use fully qualified keys for shared layout components that cross namespaces:

```tsx
const t = useTranslations();
t("Common.loading");
t("Auth.signOut");
```

Use the locale-aware navigation helpers from `@/i18n/navigation` for links and router changes:

```tsx
import { Link, useRouter } from "@/i18n/navigation";
```

## Review Checklist

- The same flattened keys exist in both `localization/messages/en.json` and `localization/messages/vi.json`.
- All placeholders in the English value exist in the Vietnamese value.
- User-visible component copy is translated or deliberately documented as hard-coded.
- Route links use `@/i18n/navigation` where the route is user-facing.
- New text fits compact UI surfaces in both English and Vietnamese.
- Error and empty-state copy exists for both locales.

## Known Migration Work

- Move remaining dashboard helper strings and action text into `Dashboard`.
- Move layout titles/tooltips such as mobile brand text, search placeholder, settings/help titles, and new reading title into `Common` or `Navigation`.
- Replace English-only date and plural formatting in the dashboard with locale-aware formatting.

## References

- `localization/messages/en.json`
- `localization/messages/vi.json`
- `src/i18n/navigation.ts`
- `src/components/layout/dashboard-sidebar.tsx`
- `src/app/[locale]/page.tsx`
