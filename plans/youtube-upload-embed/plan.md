---
title: YouTube Upload and Embed
description: >-
  Replace Website button with YouTube in upload modal, add YouTube URL input,
  extract transcript for vocabulary study, add Video toggle in content panel
status: in-progress
priority: P2
branch: preview
tags:
  - youtube
  - upload
  - embed
blockedBy: []
blocks: []
created: '2026-07-17T09:57:16.987Z'
createdBy: ck-cli
source: cli
---

# YouTube Upload and Embed

## Overview

Implement YouTube upload flow that extracts video transcript for vocabulary study, and adds Video toggle in content panel to watch the embedded video.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Research](./phase-01-research.md) | Completed |
| 2 | [Implement Backend](./phase-02-implement-backend.md) | In Progress |
| 3 | [Implement UI](./phase-03-implement-ui.md) | Pending |

## Dependencies

- None - new feature implementation

## Notes

- Fast check: Block videos without transcripts at upload time
- Use youtube-transcript package
- Regex for video ID: `/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i`
