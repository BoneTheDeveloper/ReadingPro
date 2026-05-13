# React Resizable Panels Research Report: Collapsible Behavior Analysis

**Date:** 2026-05-14
**Subject:** Understanding `collapsedSize`, `minSize`, and `collapsible` prop interactions

## Summary

Research completed on `react-resizable-panels` library API, focusing on collapsible panel behavior, `collapsedSize`/`minSize` interactions, and relevant callbacks for making panels properly shrink to collapsed size even when minSize > collapsedSize.

---

## Key Findings

### 1. `collapsedSize`, `minSize`, and `collapsible` Prop Interactions

**Source:** [GitHub Repository - bvaughn/react-resizable-panels](https://github.com/bvaughn/react-resizable-panels)

**Core Behavior:**
- **`collapsible: true`** - Enables panel collapse behavior
- **`collapsedSize`** - Size when collapsed (defaults to 0%)
- **`minSize`** - Minimum size before collapse occurs
- **Critical Finding**: "A collapsible panel will collapse when it's size is less than of the specified `minSize`"

**Interaction Logic:**
```tsx
<Panel
  collapsedSize={0}              // Target size when collapsed
  collapsible={true}            // Enables collapse behavior
  defaultSize={200}             // Initial expanded size
  minSize={100}                 // Minimum size before collapse
  maxSize={500}
>
  {/* content */}
</Panel>
```

**Key Behavior:**
- When `minSize = 100` and `collapsedSize = 0`, the panel will collapse when resized below 100px
- The collapsedSize takes effect only after minSize threshold is crossed
- The library internally handles the size reduction from minSize to collapsedSize

### 2. Best Practice: Shrinking Below minSize

**Source:** [Issue #266 - Update collapsed panel size when collapseSize changes](https://github.com/bvaughn/react-resizable-panels/issues/266)

**Current Behavior:**
- The library allows panels to shrink below `minSize` when collapsing
- No additional configuration needed - this is built-in behavior
- `collapsedSize` takes precedence over `minSize` during collapse state

**Implementation Pattern:**
```tsx
// Pixel-based values (as used in this project)
const navMinSize = 300;     // pixels
const navCollapseSize = 36; // pixels

<Panel
  collapsedSize={navCollapseSize}    // 36px target
  collapsible={true}                 // Enables collapse
  defaultSize={navMinSize}           // 300px default
  minSize={navMinSize}               // 300px minimum
  maxSize={60}                       // 60% max
>
  {/* panel content */}
</Panel>
```

**Key Insight:** The library automatically handles the transition from `minSize` → `collapsedSize` when collapsing.

### 3. Callbacks and Event Handling

**Source:** [CHANGELOG.md](https://github.com/bvaughn/react-resizable-panels/blob/main/CHANGELOG.md) - Version 4.2.0

**Available Callbacks:**
- **`onResize(panelSize, id, prevPanelSize)`** - Called when panel sizes change
- **`onCollapse()`** - Called when panel collapses
- **`onExpand()`** - Called when panel expands

**Enhancement in v4.2.0:**
- Added `prevPanelSize` parameter to `onResize` callback
- Helps simplify collapse/expand detection logic

**Callback Implementation:**
```tsx
<Panel
  onResize={(panelSize) => {
    // panelSize contains { sizePercentage: number, sizePixels: number }
    console.log('Panel resized:', panelSize);
  }}
  onCollapse={() => {
    setIsCollapsed(true);
  }}
  onExpand={() => {
    setIsCollapsed(false);
  }}
>
  {/* content */}
</Panel>
```

### 4. Percentage vs Pixel Values

**Source:** [GitHub Repository Documentation](https://github.com/bvaughn/react-resizable-panels)

**Supported Formats:**
- **Percentage strings** (e.g., `"33%`, `50`)
- **Pixel values** (e.g., `300`, `"400px"`)
- **Relative font units** (e.g., `2rem`)
- **Viewport units** (e.g., `50vh`)

**Detection Rules:**
- Numeric values → treated as pixels
- Strings without units → treated as percentages
- Strings with explicit units → parsed accordingly

**Best Practice for Project:**
```tsx
// This project uses pixel values in a wrapper
const collapsedSize = 36;  // treated as 36px
const minSize = 300;       // treated as 300px

<Panel collapsedSize={collapsedSize} minSize={minSize} />
```

### 5. Critical Finding: No Additional Configuration Needed

**Key Revelation:** The library inherently supports shrinking below `minSize` when collapsing. The `collapsedSize` prop automatically overrides `minSize` behavior during collapse state.

**No Workarounds Required:**
- No need to dynamically adjust `minSize` based on collapse state
- No need to manually calculate percentage conversions (wrapper handles this)
- Built-in logic handles minSize → collapsedSize transition seamlessly

---

## API Reference Summary

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `collapsedSize` | `number \| string` | `"0%"` | Size when collapsed |
| `collapsible` | `boolean` | `undefined` | Enable collapse behavior |
| `minSize` | `number \| string` | `"0%"` | Minimum size before collapse |
| `maxSize` | `number \| string` | `"100%"` | Maximum size |
| `onResize` | `(size: PanelSize) => void` | undefined | On resize callback |
| `onCollapse` | `() => void` | undefined | On collapse callback |
| `onExpand` | `() => void` | undefined | On expand callback |

---

## Recommendations for Implementation

1. **Use the built-in behavior** - No additional configuration needed for collapsing below minSize
2. **Leverage the wrapper** - Continue using pixel values as currently implemented
3. **Implement callbacks** - Use `onCollapse`/`onExpand` for state management
4. **Handle resize events** - Use `onResize` for dynamic size calculations if needed

---

## Unresolved Questions

1. Are there any edge cases with very small `collapsedSize` values that might cause visual glitches?
2. How does the library handle window resizing with collapsed panels? (Referenced in issue #266)
3. Are there performance considerations when using multiple collapsible panels with frequent callbacks?

---

## Sources

1. [react-resizable-panels GitHub Repository](https://github.com/bvaughn/react-resizable-panels)
2. [Official Documentation](https://react-resizable-panels.vercel.app/)
3. [Issue #266 - Update collapsed panel size when collapseSize changes](https://github.com/bvaughn/react-resizable-panels/issues/266)
4. [CHANGELOG.md - Version 4.2.0 enhancements](https://github.com/bvaughn/react-resizable-panels/blob/main/CHANGELOG.md)

---

**Status:** DONE  
**Concerns:** Minor visual glitch potential with very small collapsed sizes requires testing