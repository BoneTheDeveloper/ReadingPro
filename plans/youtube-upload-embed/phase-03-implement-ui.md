---
phase: 3
title: Implement UI
status: pending
effort: 4h
dependencies: [2]
---

# Phase 3: Implement UI

## Overview

Implement YouTube button in upload modal and Video toggle in content panel.

## Requirements

- Functional:
  - Replace disabled "Website" button with "YouTube" button
  - Add YouTube URL input view
  - Show error if no transcript available
  - Add Video toggle in content panel for YouTube sources
  - Embed YouTube player in content panel
- Non-functional: Match existing UI patterns

## Architecture

### Upload Modal Changes
- Add YouTube icon to imports
- Replace "Website" button with "YouTube" button
- Add YouTube URL input view (similar to text input)
- Show loading while checking transcript
- Show error message if video has no transcript

### Content Panel Changes
- Add "Video" option to segmented toggle
- Show YouTube embed when Video selected
- Only available for sourceType=YOUTUBE

## Related Code Files

### Modify
- `src/features/upload/components/model/upload-modal.tsx` - Add YouTube button + input
- `src/features/upload/hooks/use-upload-submit.ts` - Add handleYouTubeSubmit
- `src/features/reading/components/content-panel.tsx` - Add Video toggle + embed
- `src/features/upload/components/model/youtube-input.tsx` - New component for URL input

## Implementation Steps

1. Add YouTube icon to upload-modal.tsx
2. Replace Website button with YouTube button
3. Create YouTubeInput component
4. Add handleYouTubeSubmit to useUploadSubmit hook
   - Call server action
   - Show loading state
   - Handle "no transcript" error
5. Add Video option to content panel toggle
6. Implement YouTube embed component

## Success Criteria

- [ ] YouTube button visible in upload modal
- [ ] URL input accepts YouTube links
- [ ] Error shown if video has no transcript
- [ ] Video toggle shows for YouTube passages
- [ ] YouTube embed plays inline

## Risk Assessment

- URL validation: Handle various YouTube URL formats
- Embed: Use responsive iframe for mobile
