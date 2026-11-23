# Contract explorer browser cache

`getSourceCode`, `getSourceCodeWithMetadata`, and `fetchContractAbiRaw` share
`lib/contractMetadataCache.ts`. Successful verified responses for regular contracts
include source files, ABI, and name. These never expire and have no application
entry/size eviction limit. Browser quota failures fall back to normal loading;
clearing site data or browser-managed eviction can remove cached data.

Proxy responses (implementation address present or explorer `Proxy: "1"`) are
never persisted. Old proxy entries from the previous expiring cache are ignored.
Each proxy visit fetches fresh metadata; the explorer also checks the on-chain
implementation before choosing its ABI, so an indexed implementation that lags an
upgrade does not override the live target. Implementation contracts can use their
own permanent verified cache, keyed by their own chain/address identity.
Live EIP-7702 delegation resolution remains in place.

Unverified regular contracts save their reconstructed ABI in a separate
`decompiled` store only after successful on-chain non-proxy resolution. On revisit,
functions render directly from that store while RPC and verification continue in
the background. Inferred-function warnings remain visible. If verification now
succeeds, the UI replaces inferred functions with the verified ABI and source,
and the reconstructed cache is removed. A still-unverified contract reuses its
saved reconstruction rather than repeating signature lookup/decompilation.
Proxies/delegations and user-edited ABIs never populate this store.

The IndexedDB database `ethsh-contract-metadata` (version 2) is separate from
compiler workspaces and deployment history. Both stores use chain ID and
lowercased address keys. `lib/browser/database.ts` reuses the compiler deployment
history connection lifecycle, including recovery after blocked/failed opens and
version changes. Server callers retain their network behavior. Concurrent
source/ABI lookups share an in-flight request; unsuccessful responses are never
stored as verified metadata.

Run `pnpm test:contract-cache` and `pnpm test:contract-abi` for persistence,
identity isolation, proxy freshness, verification upgrades, and UI restoration.

The contract selected by the incoming URL restores its cache first. After that
cache lookup commits to the UI (including a cache miss), the workspace warms the
remaining saved address panels during browser idle time, one cache restoration
at a time. Selecting an unprepared tab loads it immediately. Background loading
does not change the selected tab or URL. Visited and warmed panels remain mounted
so switching tabs preserves inputs/results and is ready when loading has completed.
Function skeletons are shown only after the initial browser-cache lookup misses;
cache hits paint saved functions directly with the address form remaining visible.
