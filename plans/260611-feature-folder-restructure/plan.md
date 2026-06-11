# Plan: Restructure Feature Folders to Match Conventions

## Overview
Reorganize ALL feature folders to match page-composition-conventions.md. Includes folder restructuring, service placement fixes, and hook extraction.

## Phases

### Phase 1: Upload Feature — Folder + Service + Hook
**Status:** pending

Folder moves:
| File | From | To |
|------|------|----|
| upload-page-client.tsx | flat | ui/ |
| processing-page-client.tsx | flat | ui/ |
| upload-zone.tsx | flat | ui/ |
| text-input-area.tsx | flat | ui/ |
| analyze-content-action.ts | flat | actions/ |
| upload-workflow.ts | flat | services/ |

Service move:
| File | From | To |
|------|------|----|
| content-analysis-service.ts | features/upload | src/lib/upload/content-analysis/content-analysis.service.ts |

Hook extraction:
- Extract upload fetch logic from upload-page-client into `ui/use-upload-submit.ts`

Import updates:
- upload-workflow.ts → content-analysis import → @/lib/upload/content-analysis/content-analysis.service
- analyze-content-action.ts → content-analysis import → @/lib/upload/content-analysis/content-analysis.service
- upload-page-client.tsx → uses new hook instead of inline fetch
- External: upload/page.tsx, processing/page.tsx, api/upload/route.ts, api/upload/text/route.ts

### Phase 2: Vocabulary Feature — Folder
**Status:** pending

Folder moves:
| File | From | To |
|------|------|----|
| vocabulary-page-client.tsx | flat | ui/ |
| vocabulary-list.tsx | flat | ui/ |
| vocabulary-set-list.tsx | flat | ui/ |
| vocabulary-item-card.tsx | flat | ui/ |
| vocabulary-set-row.tsx | flat | ui/ |
| vocabulary-page-ui.tsx | flat | ui/ |
| vocabulary-types.ts | flat | model/ |
| use-vocabulary-list.ts | flat | model/ |
| use-vocabulary-sets.ts | flat | model/ |

Import updates: internal cross-folder refs → ../model/..., external → ui/vocabulary-page-client

### Phase 3: Dictionary Feature — Folder + Hook
**Status:** pending

Folder moves:
| File | From | To |
|------|------|----|
| dictionary-page-client.tsx | flat | ui/ |
| dictionary-entry-card.tsx | flat | ui/ |
| dictionary-suggest-dropdown.tsx | flat | ui/ |
| use-save-dictionary-vocabulary.ts | flat | model/ |

Hook extraction:
- Extract suggest+detail fetch from dictionary-page-client → model/use-dictionary-suggest.ts + model/use-dictionary-entry-detail.ts

### Phase 4: Study Upload Action — Delegate DB to Service
**Status:** pending

Extract db.passage.create from study-upload-action → lib service
- Create src/lib/upload/passage-create/passage-create.service.ts
- study-upload-action delegates to the new service

### Phase 5: Update Docs
**Status:** pending

Update page docs to reflect new paths.

### Phase 6: Build Verification
**Status:** pending

Run build, verify no broken imports.
