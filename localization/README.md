# Localization

This folder owns user-interface localization assets and localization-specific docs.

## Folders

- `messages/` contains `next-intl` JSON message catalogs.
- `docs/` contains locale routing, architecture, and translation authoring guidance.

## Runtime

`src/i18n/request.ts` loads the active catalog from `localization/messages/{locale}.json`.
