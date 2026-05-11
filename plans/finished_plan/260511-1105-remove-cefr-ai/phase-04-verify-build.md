---
phase: 4
title: Verify Build
status: completed
priority: P1
effort: 5m
dependencies:
  - 3
---

# Phase 4: Verify Build

## Overview

Full build verification — lint, type-check, production build.

## Implementation Steps

1. Run `npx tsc --noEmit` — type errors?
2. Run `npm run lint` — lint errors?
3. Run `npm run build` — production build succeeds?
4. Verify no dead imports or orphaned references

## Success Criteria

- [ ] `npx tsc --noEmit` clean
- [ ] `npm run lint` clean
- [ ] `npm run build` succeeds
- [ ] No references to `cefr-detector` anywhere in codebase
