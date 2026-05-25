---
title: "Playwright E2E Testing & Test User Setup"
description: "Install Playwright, create test user with Supabase auth, wire up auth injection so agents can run integration tests. E2E specs deferred."
status: pending
priority: P2
effort: 4h
branch: "feature/playwright-e2e-test-user"
tags: ["testing", "playwright", "e2e", "auth"]
blockedBy: []
blocks: []
created: "2026-05-25"
createdBy: "ck:plan"
source: skill
---

# Playwright E2E Testing & Test User Setup

## Overview

Minimal Playwright setup: install, configure, create test user, wire auth injection. No E2E specs yet — agents (like Claude) can use the infrastructure for integration testing later.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Playwright Install & Config](./phase-01-playwright-install-config.md) | Pending |
| 2 | [Test User & Auth Setup](./phase-02-test-user-auth-setup.md) | Pending |

## NOT in scope (deferred)

- E2E test specs for auth flows (sign-in, sign-up, sign-out)
- E2E test specs for core flows (study, upload, progress)
- CI workflow for E2E
- Page object models for feature pages

## Dependencies

- Supabase project accessible (remote or local)
