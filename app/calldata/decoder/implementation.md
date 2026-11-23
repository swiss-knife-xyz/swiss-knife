# Calldata decoder parameter tree

The decoder, Tx decode modal and wallet request modal use the shared `components/decodedParams/CalldataTree.tsx`. The obsolete TreeView/TreeNode/TreeContext implementation has been removed.

## Layout and interaction

- The calldata layout allows up to 1760px, with horizontal tool navigation on small screens.
- Parameters retain inline value controls: number conversion, ENS/address labels, explorer links, copy, and byte formats.
- Each nested bytes header combines the parameter name, Solidity type, decoded function, and parameter count. Synthetic transaction wrappers are labeled by their transaction index.
- Type icons and their existing semantic colors distinguish addresses, numbers, bytes, tuples, and arrays. Function names use terminal icons and syntax colors. Nested groups use compact indentation and neutral guides. There are no colored call cards or separate inspector panes.
- Raw bytes for decoded branches are revealed inline using the header's Raw bytes button.
- Expand all, Collapse all, Enter, and Space control disclosure. Collapsed content stays mounted so format selections and address state survive folding.
- The centered header, source tabs, and single-line calldata input retain the original page design. The input stays visible while inspecting results.
- Numeric fields show exact values. Hovering shows comma-separated and compact forms in a dark tooltip positioned above the cursor; decoded value fields retain native text selection and keyboard focus, with the editing caret hidden. Copy buttons and format selectors remain keyboard-accessible. Shared numeric controls on other pages retain their existing Format behavior.
- Format dropdown sizing and address button corners are customized through optional shared-component props.

## Sticky context

The result grows to its full content height and scrolls with the page. The decoder layout enables native page sticky positioning by keeping its ancestors free of scroll containers. Each branch header uses native CSS `position: sticky`, a 28px height, and a top offset based on its ancestry depth. Headers remain inside their own branch containers, so outgoing sibling context is pushed away as the next branch comes into view. Opaque backgrounds and depth-based stacking keep ancestor headers legible above inline values.

There are no scroll event handlers, bounding-box measurements, timers, or body portals for tree headers. The same component renders decoded event parameters without a function root. Small screens stack the parameter label above its inline controls; long branch headers can be scrolled horizontally within the header.

## State

Expandable paths are derived from decoded arguments, including arrays, tuples, and nested decoded bytes. A new result resets expansion to fully open. Raw-byte disclosure is local to each parameter; conversion controls remain the existing shared components.

## Editing and re-encoding

`EditableCalldata` adds an isolated draft session to the decoder and the Tx
decoded-calldata modal. Other users of `CalldataTree` remain read-only. The Tx
modal starts lazy-loading the same editor at Decode click, in parallel with
recipient/ABI decoding. It reuses an already-resolved recipient only when the
resolution matches the current input, with Edit calldata on the left of the copy
controls, and snapshots the decoded destination/network for result links.
`createDecoderResultLink` shares address-aware/ABI-aware new-tab navigation. Its optional editor interface supplies typed
leaf inputs and branch actions while reusing disclosure, indentation, sticky
ancestry and responsive layout. The shared input renderer uses the contract explorer’s address/name-service
widget and integer unit selectors. Drafts retain resolved addresses and base-unit
integers; widget validation and pending name resolution block encoding.

`lib/calldataEditor.ts` reconstructs schemas from exact function signatures and
requires selector and full-byte round trips before allowing structured editing.
Tuples use positional components (including unnamed/duplicate fields), arrays
retain fixed lengths, and dynamic arrays support adding/removing entries.
Nested calls inside bytes are rebuilt bottom-up. Unsupported/heuristic payloads
stay raw-byte fields. Replacing raw bytes discards that branch's decoded draft.

Safe MultiSend has a dedicated packed-transactions adapter using the extracted
`encodeSafeMultiSendTransactions` helper from the existing encoder. Transaction
byte lengths are derived from edited data; operations accept only CALL (0) and
DELEGATECALL (1). Synthetic display signatures are never encoded as real calls.

Untouched nested calls preserve their original bytes. Encoding validates every
changed value and clears outdated output immediately after edits. Reset/cancel
and new decodes discard the draft. Decode result opens a new decoder tab. From-address and transaction decodes
carry the original destination and chain ID along with the edited calldata.
Other sources use the existing share-link format with retained function
definitions. The current draft and transaction stay open.
Reverts, heuristic roots and unsupported root formats have no edit action.

Run `pnpm test:calldata-editor` for pure recursive encoding and UI coverage.

`lib/calldataEditor.correctness.spec.ts` compares edited calldata byte-for-byte
with ethers (independent of the production viem encoder), plus a hardcoded ERC-20
transfer vector. It covers all integer widths and fixed-bytes sizes, integer
overflow/underflow, generated nested tuple/array layouts, Unicode and padding,
overloads, duplicate/unnamed fields, and structural array edits. Safe tests use
an independent packed-byte builder/parser to verify nested calls, transaction
ordering, data lengths, additions/removals, invalid operations, and empty batches.
The MultiSend packer explicitly returns hex `0x` for an empty batch; viem's
generic empty concatenation otherwise returns a Uint8Array at runtime.
UI regressions also verify raw/decoded toggles preserve edited nested values and
that invalid changes immediately remove stale encoded results.

### Live clear signing

The editor publishes recursively encoded draft calldata as values change, without
requiring Encode changes. Preview updates are bound to their decoded result so a
late draft cannot affect a newer decode. Invalid or unresolved widget inputs
publish an invalid state and replace an existing summary with a status message.
Reset/cancel restores the original summary. Transaction events remain original.

The preview reuses the original clear-signing request’s destination, sender,
network and native value, replacing only calldata. Unchanged saved examples use
their snapshots; changed drafts leave the snapshot context for live resolution.
Live lookups use a 150ms debounce to coalesce typing. The existing keyed summary
cancels stale responses and optionally displays a
pending/unavailable state to keep an existing summary column readable.
