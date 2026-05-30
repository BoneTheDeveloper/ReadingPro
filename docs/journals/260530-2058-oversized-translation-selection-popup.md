# Oversized Translation Selection Popup

Fixed the study page quick-translation behavior for selections over the 500-character limit. The previous flow kept the selection and rendered a fixed warning popup with a character count, which felt visually unnatural for long highlighted text.

The selection handler now clears quick-translation UI state for over-limit selections, records a Sentry breadcrumb, and keeps the translate request guard in place. Added limit helper coverage and updated the integration test to verify no popup, no translate button, and no `/api/translate` request for oversized selections.
