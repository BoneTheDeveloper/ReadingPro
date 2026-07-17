---
phase: 2
title: Implement Backend
status: in-progress
effort: 4h
dependencies: []
---

# Phase 2: Implement Backend

## Overview

Implement server-side YouTube URL validation and transcript check. Block uploads for videos without transcripts (fast approach).

## Requirements

- Functional:
  - Validate YouTube URL format
  - Extract video ID from various URL formats
  - Check transcript availability BEFORE creating passage
  - Block upload if no transcript available
- Non-functional: Fast check, no unnecessary processing

## Architecture

### Fast Check Flow
1. Client sends YouTube URL → Server Action
2. Extract video ID from URL using Regex
3. Try to fetch transcript with youtube-transcript (try/catch)
4. If success → create UploadJob → Inngest event → passage
5. If catch (no transcript) → Return 400 error immediately

### Schema Changes
- Add `youtubeUrl` field to Passage model (optional string)

### Cost-Effective Strategy
- Block videos without transcripts at upload time
- No wasted processing on videos that can't be studied
- Fast fail = better UX

## Related Code Files

### Create
- `src/features/upload/server/services/parsers/youtube-transcript.ts` - Transcript fetcher

### Modify
- `src/features/upload/server/actions/upload.ts` - Add YouTube upload action
- `src/features/upload/server/inngest/events.ts` - Add youtubeUrl to event
- `src/features/upload/server/inngest/process-upload.ts` - Handle YOUTUBE source type
- `prisma/schema.prisma` - Add youtubeUrl to Passage model

## Implementation Steps

1. Add YouTube URL validation + video ID extraction helper
   - Use regex: `/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i`
2. Create uploadYouTubeAction server action
3. In server action: try fetch transcript first
   - Success → continue to create job + event
   - Catch → return 400 error "No transcript available"
4. Add youtubeUrl to Inngest event schema
5. Worker processes YouTube (same as PDF/text flow)
6. Add youtubeUrl to Passage model

## Success Criteria

- [ ] YouTube URL validation works for all formats
- [ ] Video ID extracted correctly
- [ ] Transcript check blocks videos without captions
- [ ] Blocked videos return clear error message
- [ ] Successful uploads store youtubeUrl

## Error Messages

- Invalid URL: "Invalid YouTube URL"
- No transcript: "This video doesn't have captions/subtitles available"
