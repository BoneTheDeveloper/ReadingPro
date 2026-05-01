# Plan: Set up Pino Logger with Environment-Based Configuration

**Issue:** [ENG-18](https://linear.app/english-reading-app/issue/ENG-18/set-up-pino-logger-with-environment-based-configuration)
**Branch:** `catus2k4/eng-18-set-up-pino-logger-with-environment-based-configuration`
**Project:** Pino Logger

## Overview

Install and configure Pino as the structured logging solution with environment-based configuration.

## Phases

### Phase 01: Install Dependencies
- [ ] Install `pino` and `pino-pretty` (dev dep)
- [ ] Status: pending

### Phase 02: Create Logger Module
- [ ] Create `src/lib/logger.ts` — singleton logger with env-based config
- [ ] Status: pending

### Phase 03: Environment Configuration
- [ ] Add `LOG_LEVEL` to `.env.example`
- [ ] Status: pending

## Key Decisions

- **Singleton pattern**: Export a single logger instance, provide `createModuleLogger()` helper for child loggers
- **Transport**: `pino-pretty` via `transport` option in dev, raw JSON in prod
- **Log level**: From `LOG_LEVEL` env var, fallback to `debug` in dev / `info` in prod
- **Edge runtime compatibility**: Use `pino` only in server-side code (API routes, server actions, lib)

## Files to Create/Modify

| File | Action |
|------|--------|
| `package.json` | Modify — add deps |
| `src/lib/logger.ts` | Create — logger module |
| `.env.example` | Modify — add LOG_LEVEL |
