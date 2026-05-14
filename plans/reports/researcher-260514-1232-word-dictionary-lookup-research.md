# Word Dictionary/Translation Lookup Research Report

## API Options

### Free Dictionary API (dictionaryapi.dev)
- **URL**: `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`
- **Usage**: Free, no auth required
- **Response format**: JSON with word, phonetics, meanings, examples
- **Vietnamese support**: None - English only

### Translation Options
- **Lingvanex**: Vietnamese translation API (free tier available)
- **Google Translate API**: Free tier (100k chars/day)
- **Local fallback**: Store common word pairs in database

## Implementation Approach

### React Word Selection
- Use `window.getSelection()` + `onMouseUp` event
- Handle `selectionchange` event for real-time selection
- Minimum word length validation (3+ characters)

### UI Patterns
- **Tooltip**: Best for inline lookup, use `react-tooltip` library
- **Popover**: For rich content with images/audio
- **Inline**: For persistent definitions in study mode

### Performance Considerations
- Cache API responses (local storage/cache)
- Debounce rapid selections
- Lazy load for large texts

## Recommended Stack

1. **API**: Free Dictionary API + Lingvanex for Vietnamese
2. **UI**: `react-tooltip` for positioning
3. **Selection**: Custom hook using `useSelection`
4. **Caching**: `react-query` for API state management

## Code Structure
```tsx
// components/dictionary-tooltip.tsx
// hooks/use-word-selection.ts
// services/dictionary-service.ts
```

**Sources:**
- [Free Dictionary API](https://dictionaryapi.dev/)
- [Lingvanex Vietnamese API](https://lingvanex.com/services/vietnamese-translation-api/)
- [React Tooltip Guide](https://www.spazioversatile.com/react-tooltip-the-complete-guide-to-setup-customization-amp-accessibility/)

**Status:** DONE