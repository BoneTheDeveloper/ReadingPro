---
phase: 1
title: Research
status: completed
effort: 2h
---

# Phase 1: Research

## Overview

Research best approaches for YouTube transcript extraction and embedding, including cost-effective handling of videos without transcripts.

## Requirements

- Functional: Find reliable way to extract YouTube video transcripts
- Non-functional: Cost-effective, handle missing transcripts gracefully

## Cost Considerations

### Videos WITHOUT Transcript
1. **Skip upload entirely** — Don't allow upload if no transcript available (free, simple)
2. **Upload anyway, store URL only** — Allow video without transcript for embedding (user watches, no vocab study)
3. **Auto-generate transcript** — Use Whisper API (expensive, ~$0.10/minute)

### Decision: Option 2 - Upload Anyway (URL Only)
- Allow YouTube upload even without transcript
- Store youtubeUrl for embedding
- Set content empty or show "No transcript available" message
- User can still watch video for listening practice
- For vocabulary study, user would need transcript-enabled videos

## Architecture

### Option A: YouTube Data API v3
- Pros: Official API, reliable, free tier available
- Cons: Requires API key, rate limits

### Option B: youtube-transcript npm package
- Pros: No API key needed, simple to use
- Cons: Third-party, may break

### Option C: scrape-tube / ytfzf
- Pros: Open source
- Cons: Complex setup

## Decision: Option B - youtube-transcript
- Free, no API key needed
- Simple to integrate
- Falls back gracefully when no transcript

## Implementation Steps

1. Research YouTube transcript extraction options
2. Evaluate pros/cons of each approach
3. Select approach and document
4. Document handling of missing transcripts (allow upload, store URL)

## Success Criteria

- [ ] Selected approach documented
- [ ] Cost strategy documented (allow upload without transcript)
- [ ] No external dependencies blocking implementation

## Risk Assessment

- Rate limiting from YouTube API
- Transcript availability (not all videos have captions) — handled via Option 2
