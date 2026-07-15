---
phase: 5
title: Update code-standards.md documentation
status: completed
priority: P2
effort: 30m
---

# Phase 5: Update code-standards.md documentation

## Overview

Clean up `docs/code-standards.md` to remove implementation notes and make it a clear convention reference.

## Requirements

- Functional:
  - Remove any "pending migration" notes or TODOs
  - Remove references to old patterns being removed
  - Make it a clean convention doc (not a plan or report)

- Non-functional:
  - Doc reads as authoritative convention guide
  - No mention of migration progress or status

## Architecture

The doc should describe:
1. **What** the conventions are (schema patterns)
2. **Where** to put them (file locations)
3. **How** to name them (suffix conventions)

NOT:
- Implementation progress
- Migration status
- Old patterns being replaced

## Implementation Steps

1. **Read current `code-standards.md`**
   - Identify any migration notes, TODOs, or implementation status text

2. **Clean up sections**
   - Remove "Response envelope → direct Response.json" pending note
   - Remove "Migrate translateResponseSchema" pending note
   - Remove "Rename *DataSchema → interface *Dto" pending note
   - Keep only the actual convention rules

3. **Verify conventions are clear**
   - Naming table complete (InputSchema, QuerySchema, Dto, Model)
   - File organization clear (schemas/, services/)
   - Zod best practices section accurate
   - Response patterns section clear

## Success Criteria

- [ ] No migration status or TODO comments in doc
- [ ] Doc reads as authoritative convention reference
- [ ] All conventions match the migrated code

## Risk Assessment

- None — documentation only
- Mitigation: read carefully to ensure no important info removed
