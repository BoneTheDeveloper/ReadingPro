---
phase: 4
title: "Docker and Generated Output Hygiene"
status: pending
priority: P2
effort: "30m"
dependencies: [3]
---

# Phase 4: Docker and Generated Output Hygiene

## Overview
Ensure Docker-based screenshot commands write generated files back to the host while keeping generated output and auth artifacts out of source control.

## Requirements
- Functional: Docker screenshot runs mount `generated/screenshot` from host to container.
- Functional: generated screenshots appear on the host after `make screenshot`.
- Functional: `.auth/`, `generated/`, Playwright reports, and test results stay ignored by git.
- Non-functional: Docker image context does not include unnecessary generated artifacts.

## Architecture
The Make target creates the host output directory, mounts it into the Playwright container, and passes `SCREENSHOT_DIR=generated/screenshot` or a container path that resolves to the mounted host directory.

Git ignores local/generated artifacts. Docker ignore excludes generated output and auth state from image builds.

## Related Code Files
- Modify: `Makefile`
- Modify: `.gitignore`
- Modify: `.dockerignore`
- Review: `docker-compose.e2e.yml`
- Review: `Dockerfile.playwright`

## Implementation Steps
1. Update `make screenshot` to create `generated/screenshot`.
2. Mount the host `generated/screenshot` directory into the container.
3. Pass `SCREENSHOT_PATH`, `SCREENSHOT_NAME`, and `SCREENSHOT_DIR` consistently.
4. Confirm `.gitignore` ignores `/generated/` and `/.auth/`.
5. Confirm `.dockerignore` excludes generated output and auth state.

## Success Criteria
- [ ] Docker screenshot output appears under host `generated/screenshot/`.
- [ ] `git status --short` does not show generated screenshots.
- [ ] Docker build context excludes generated screenshots and auth state.

## Risk Assessment
The main risk is mismatched host/container paths. Keep Make variables explicit and avoid using `PATH` as a user-facing parameter.
