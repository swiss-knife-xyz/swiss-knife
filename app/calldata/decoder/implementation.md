# Calldata decoder parameter tree

The decoder page uses `components/CalldataTree.tsx`. The shared `TreeView` remains available to other tools.

## Layout and interaction

- The calldata layout allows up to 1760px, with horizontal tool navigation on small screens.
- Parameters retain inline value controls: number conversion, ENS/address labels, explorer links, copy, and byte formats.
- Each nested bytes header combines the parameter name, Solidity type, decoded function, and parameter count. Synthetic transaction wrappers are labeled by their transaction index.
- Type icons and their existing semantic colors distinguish addresses, numbers, bytes, tuples, and arrays. Function names use terminal icons and syntax colors. Nested groups use compact indentation and neutral guides. There are no colored call cards or separate inspector panes.
- Raw bytes for decoded branches are revealed inline using the header's Raw bytes button.
- Expand all, Collapse all, Enter, and Space control disclosure. Collapsed content stays mounted so format selections and address state survive folding.
- The centered header, source tabs, and single-line calldata input retain the original page design. The input stays visible while inspecting results.
- Numeric fields show exact values. Hovering shows comma-separated and compact forms in a dark tooltip positioned above the cursor; keyboard focus shows an anchored tooltip. Shared numeric controls on other pages retain their existing Format behavior.
- Format dropdown sizing and address button corners are customized through optional shared-component props.

## Sticky context

The result grows to its full content height and scrolls with the page. The decoder layout enables native page sticky positioning by keeping its ancestors free of scroll containers. Each branch header uses native CSS `position: sticky`, a 28px height, and a top offset based on its ancestry depth. Headers remain inside their own branch containers, so outgoing sibling context is pushed away as the next branch comes into view. Opaque backgrounds and depth-based stacking keep ancestor headers legible above inline values.

There are no scroll event handlers, bounding-box measurements, timers, or body portals for tree headers. The same component renders decoded event parameters without a function root. Small screens stack the parameter label above its inline controls; long branch headers can be scrolled horizontally within the header.

## State

Expandable paths are derived from decoded arguments, including arrays, tuples, and nested decoded bytes. A new result resets expansion to fully open. Raw-byte disclosure is local to each parameter; conversion controls remain the existing shared components.
