# Calldata Decoder Tree View - Implementation Guide

This document explains how the decoded calldata is rendered using a collapsible tree view structure, similar to VS Code's file explorer.

## Overview

The calldata decoder takes Ethereum calldata (hex-encoded function calls) and decodes it into a human-readable tree structure. The tree supports:

- Collapsible/expandable nodes
- Type-specific icons and colors
- Nested function calls (decoded bytes)
- **Sticky scroll headers** (VS Code-style breadcrumb trail when scrolling)
- Focus/dim interaction feedback
- **Clickable connector lines** (click to toggle parent node)
- All nodes expanded by default

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CalldataDecoderPage                       │
│  - Handles input (calldata, ABI, address, tx)               │
│  - Calls decodeRecursive() to get decoded result            │
│  - Renders TreeView with decoded args                        │
│  - Wraps TreeView in Box with data-tree-wrapper attribute   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        TreeView                              │
│  - Entry point for tree rendering                           │
│  - Wraps content with TreeProvider (context)                │
│  - Renders TreeControls (Expand/Collapse All)               │
│  - Renders StickyHeaders (via React Portal)                 │
│  - Renders FunctionRootNode or TreeNodes                    │
│  - Manages sticky scroll behavior with useStickyScroll hook │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      TreeProvider                            │
│  - Manages global state via React Context                   │
│  - Tracks expanded nodes, focused node, sticky headers      │
│  - Provides expand/collapse functions                       │
│  - Tracks visible sticky headers for scroll behavior        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       TreeNode                               │
│  - Renders individual parameter nodes                       │
│  - Handles clickable connector lines (toggle parent)        │
│  - Delegates to type-specific components for values         │
│  - Recursively renders children for nested types            │
│  - Registers sticky header metadata via data attributes     │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
components/decodedParams/TreeView/
├── index.tsx           # Barrel exports
├── TreeContext.tsx     # Global state management
├── TreeView.tsx        # Main container component
├── TreeNode.tsx        # Individual tree node component
├── TreeBytesParam.tsx  # Bytes value display with format dropdown
└── TypeIcon.tsx        # Type-specific icons
```

## Components

### 1. TreeContext (`TreeContext.tsx`)

Manages global tree state using React Context.

#### State

| State | Type | Description |
|-------|------|-------------|
| `expandedNodes` | `Set<string>` | Set of node IDs that are currently expanded |
| `allNodeIds` | `string[]` | All registered expandable node IDs |
| `focusedNodeId` | `string \| null` | Currently focused node (for dim effect) |
| `visibleStickyHeaders` | `StickyNodeMeta[]` | Headers currently shown in sticky area |
| `scrollContainerRef` | `RefObject<HTMLDivElement>` | Reference to the tree container |
| `stickyNodes` | `Map<string, StickyNodeMeta>` | Registry of all sticky-capable nodes |

#### Functions

| Function | Description |
|----------|-------------|
| `toggleNode(nodeId)` | Toggle expand/collapse state for a node |
| `expandAll()` | Expand all registered nodes |
| `collapseAll()` | Collapse all nodes |
| `isExpanded(nodeId)` | Check if a node is expanded |
| `registerNode(nodeId, depth, childCount)` | Register a node for expand/collapse all |
| `registerStickyNode(meta)` | Register a node for sticky header tracking |
| `unregisterStickyNode(nodeId)` | Unregister a sticky node |
| `setVisibleStickyHeaders(headers)` | Update which headers are currently sticky |

#### Helper Functions

| Function | Description |
|----------|-------------|
| `countDescendants(arg)` | Count total descendants of a node |
| `shouldExpandByDefault(depth, arg)` | Determine if node should start expanded |
| `hasChildren(arg)` | Check if arg has nested children |
| `getChildrenCount(arg)` | Get number of direct children |
| `getChildTypeLabel(arg)` | Get label like "(3 items)" or "(5 fields)" |

#### Default Expand Behavior

All nodes are expanded by default for maximum visibility:

```typescript
function shouldExpandByDefault(_depth: number, _arg: Arg): boolean {
  // Expand all nodes by default
  return true;
}
```

Users can manually collapse nodes or use the "Collapse All" button to hide nested content.

#### Focus/Dim Feature

When a node is toggled, it becomes "focused" for 2 seconds. During this time:
- The focused node and its ancestors/descendants stay at full opacity
- Unrelated nodes dim to 40% opacity
- Creates visual feedback showing which branch the user is interacting with

### 2. TreeView (`TreeView.tsx`)

Main entry point that wraps everything with the context provider.

#### Props

```typescript
interface TreeViewProps {
  args: Arg[];           // Decoded arguments to display
  chainId?: number;      // Chain ID for explorer links
  functionName?: string; // Function name (renders as root node)
}
```

#### Components

- **TreeControls**: Expand All / Collapse All buttons (right-aligned)
- **FunctionRootNode**: Renders the function name as the root of the tree
- **TreeContent**: Decides whether to show function root or direct args
- **StickyHeaders**: Fixed-position headers rendered via React Portal
- **StickyHeaderRow**: Individual sticky header row component

#### Function Root Node

When a function name is provided (and isn't `__abi_decoded__`), it's rendered as a prominent root node:
- Large terminal icon (green)
- Bold function name (xl size)
- Param count indicator
- Collapsible to hide all parameters

#### Sticky Scroll Headers

The tree view implements VS Code-style sticky scroll headers that keep parent nodes visible when scrolling through deeply nested data.

**How it works:**

1. **Data Attributes**: Each expandable node header has data attributes storing metadata:
   - `data-sticky-node`: Node ID
   - `data-depth`: Nesting depth
   - `data-label`: Display label
   - `data-type`: Type display string
   - `data-basetype`: Base type (tuple, array, etc.)
   - `data-isfunction`: Whether this is the function root
   - `data-functionname`: Function name (for root)
   - `data-childcount`: Number of children

2. **useStickyScroll Hook**: Listens to window scroll events and:
   - Queries DOM for `[data-sticky-node]` elements
   - Calculates which headers should be sticky based on viewport position
   - Builds an ancestor chain (only shows headers that are parents of visible content)
   - Updates `visibleStickyHeaders` state

3. **React Portal**: StickyHeaders component renders via `createPortal(content, document.body)` to:
   - Bypass any parent CSS that might affect `position: fixed`
   - Ensure headers always appear at viewport top
   - Match width/position of the tree container

4. **Click to Navigate**: Clicking a sticky header scrolls back to that node

**Visual behavior:**
```
┌──────────────────────────────────────────┐
│ >_ executeWithSig (2 params)             │  ← Sticky headers
│   ⬡ tuple                                │     (fixed at top)
│     ≡ tuple[]                            │
├──────────────────────────────────────────┤
│       ⬡ [0] tuple                        │  ← Actual content
│         # uint256                        │     (scrolling)
│           0                              │
│         <> bytes (decoded calldata)      │
│         ...                              │
└──────────────────────────────────────────┘
```

### 3. TreeNode (`TreeNode.tsx`)

Renders individual parameter nodes with connector lines.

#### Props

```typescript
interface TreeNodeProps {
  arg: Arg;              // The argument to render
  nodeId: string;        // Unique ID (e.g., "0", "0.1", "0.1.decoded.0")
  depth: number;         // Nesting depth (for indentation)
  isLast: boolean;       // Is this the last sibling? (affects connector lines)
  chainId?: number;      // For explorer links
  index?: number;        // Array index (if in array)
  showIndex?: boolean;   // Whether to show [index] label
}
```

#### Node ID Structure

Node IDs are hierarchical strings separated by dots:
- `"0"` - First top-level param
- `"0.1"` - Second child of first param
- `"0.1.decoded.0"` - First param of decoded function inside bytes

#### Clickable Connector Lines

The tree connector lines are interactive - clicking them toggles (expand/collapse) the parent node. This allows users to easily collapse sections from anywhere in the tree without scrolling up to find the collapse button.

**Implementation:**

Uses actual DOM elements (not CSS pseudo-elements) for interactivity:

```tsx
// Helper to compute parent node ID
function getParentNodeId(nodeId: string, depth: number): string | null {
  // Handle decoded paths like "0.decoded.1" -> parent is "0"
  if (nodeId.includes(".decoded.")) {
    return nodeId.split(".decoded.")[0];
  }
  
  const lastDotIndex = nodeId.lastIndexOf(".");
  if (lastDotIndex === -1) {
    // Top-level node - parent is "root" if has function root
    return depth > 0 ? "root" : null;
  }
  
  return nodeId.substring(0, lastDotIndex);
}
```

**Behavior:**

| Action | Result |
|--------|--------|
| Hover over line | Line changes color from gray (`whiteAlpha.200`) to blue (`blue.400`) |
| Click line | Toggles parent node (collapse if expanded, expand if collapsed) |

**Visual structure:**

```
│ ← Vertical line (clickable, toggles parent)
├── Node header
│   │
│   └── Horizontal line (clickable, toggles parent)
```

The hover areas are generous (20px wide for vertical, 24px for horizontal) to make clicking easy despite the thin 1px lines.

#### Node Header Row

Each node displays:
1. **Expand/Collapse chevron** (if has children)
2. **Type icon** (colored by type)
3. **Array index** `[0]` (if in array)
4. **Parameter name** (if named)
5. **Type label** (e.g., `uint256`, `address`, `tuple[]`)
6. **Collapsed count** (e.g., `(3 items)`)
7. **Explorer link** (for addresses)

#### Value Rendering

For leaf nodes (non-expandable), values are rendered below the header:

1. **Parameter name** (if named) - Shown prominently in white text
2. **Value component** - Type-specific rendering

| Type | Component | Features |
|------|-----------|----------|
| `uint*` | `UintParam` | Format dropdown (Wei, ETH, Gwei, etc.) |
| `int*` | `IntParam` | Format dropdown |
| `address` | `AddressParam` | ENS resolution, labels, explorer link |
| `bytes*` | `TreeBytesParam` | Format dropdown (Hex, Decimal, Binary, Text) |
| `string` | `StringParam` | JSON detection, URL handling |
| `bool` | `StringParam` | Simple display |

For expandable nodes (tuple, array), the parameter name is shown inline in the header row.

#### Expandable Types

For complex types, children are rendered recursively:

| Type | Behavior |
|------|----------|
| `array` | Renders each element as TreeNode with index |
| `tuple` | Renders each field as TreeNode |
| `bytes` (decoded) | Shows raw hex + decoded function container |

### 4. TreeBytesParam (`TreeBytesParam.tsx`)

Displays bytes values with a format selector dropdown.

#### Format Options

- **Hex**: Original hex value (default)
- **Decimal**: Converted to decimal number
- **Binary**: Converted to binary
- **Text**: Decoded as UTF-8 text

Uses the same dropdown pattern as `UintParam` to maintain visual consistency and not break tree flow.

### 5. TypeIcon (`TypeIcon.tsx`)

Returns appropriate icon and color for each parameter type.

#### Icon Mapping

| Type | Icon | Color |
|------|------|-------|
| `address` | FiUser | purple.400 |
| `uint*`, `int*` | FiHash | green.400 |
| `bytes*` | FiCode | orange.400 |
| `string` | FiType | cyan.400 |
| `tuple` | FiPackage | pink.400 |
| `array` | FiList | yellow.400 |
| `bool` | FiToggleLeft | teal.400 |

## Decoded Bytes Handling

When a `bytes` parameter contains valid calldata that can be decoded, it's rendered specially:

1. **Raw bytes value** with format dropdown
2. **Connector line** linking raw value to decoded content
3. **Decoded function container** with:
   - Blue left border accent
   - Subtle background
   - Function name header
   - Nested TreeNodes for decoded parameters

This creates a visual hierarchy showing:
```
bytes ─┬─ [raw hex value]
       │
       └─ ┌─────────────────────────┐
          │ decoded function: transfer │
          │   address: 0x...        │
          │   uint256: 1000         │
          └─────────────────────────┘
```

## Data Types

### Arg (from `@/types`)

```typescript
type Arg = {
  name: string;      // Parameter name (may be empty)
  baseType: string;  // Base type (uint256, address, bytes, tuple, array)
  type: string;      // Full type including array brackets
  rawValue: any;     // Original decoded value
  value: DecodeParamTypesResult;  // Processed value (may be nested)
};
```

### StickyNodeMeta

Metadata stored for each node that can become a sticky header:

```typescript
type StickyNodeMeta = {
  nodeId: string;       // Unique node identifier
  depth: number;        // Nesting depth (for indentation)
  label: string;        // Display label (e.g., "[0] name")
  type: string;         // Type display string
  baseType: string;     // Base type for icon selection
  isFunction?: boolean; // True for function root node
  functionName?: string;// Function name (for root)
  childCount: number;   // Number of children
  element: HTMLElement | null; // DOM reference for position calculation
};
```

### DecodeRecursiveResult

```typescript
type DecodeRecursiveResult = {
  functionName: string;  // e.g., "transfer"
  signature: string;     // e.g., "transfer(address,uint256)"
  rawArgs: any;          // Raw decoded arguments
  args: Arg[];           // Processed arguments array
} | null;
```

## Integration

### In CalldataDecoderPage

```tsx
{result && (
  <Box>
    <HStack mb={2} justify="flex-end">
      <CopyToClipboard textToCopy={...} labelText="Copy params" />
    </HStack>
    <Box 
      p={4} 
      bg="whiteAlpha.50" 
      borderRadius="lg" 
      border="1px solid" 
      borderColor="whiteAlpha.200"
      data-tree-wrapper="true"  // Used by sticky headers to find container bounds
    >
      <TreeView 
        args={result.args} 
        chainId={chainId} 
        functionName={result.functionName} 
      />
    </Box>
  </Box>
)}
```

### For Events

Events use TreeView without a function name, so parameters render at root level:

```tsx
<Box p={4} bg="whiteAlpha.50" data-tree-wrapper="true">
  <TreeView args={event.args} chainId={chainId} />
</Box>
```

## Visual Features Summary

1. **Clickable tree lines** - Connector lines are interactive; hover highlights in blue, click toggles parent node
2. **Sticky scroll headers** - Parent nodes stay visible at top when scrolling (like VS Code)
3. **Type-specific icons** - Quick visual identification of parameter types
4. **All expanded by default** - Full visibility of all parameters on load
5. **Global expand/collapse** - Quick access to expand or collapse entire tree
6. **Focus/dim effect** - Visual feedback when interacting with nodes (2s timeout)
7. **Decoded function containers** - Visual grouping for nested function calls
8. **Format dropdowns** - Convert bytes/uints without breaking tree flow
9. **Explorer links** - Quick access to view addresses on block explorer
10. **Prominent parameter names** - Named parameters displayed clearly for leaf nodes
