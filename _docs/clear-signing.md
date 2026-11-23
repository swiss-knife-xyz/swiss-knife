# Calldata clear signing

The calldata decoder adds an ERC-7730 summary above its existing decoded tree.
Unmatched, invalid or unavailable descriptors leave the ordinary decoder intact.
The summary is presentation metadata, not a transaction simulation or validation
of whether a call is safe. The existing raw tree and JSON controls remain visible.

## WalletChan source

Ported from `/Users/apoorvlathey/blockchain/wchan/walletchan`, revision `b54334a7`:

- `apps/extension/src/lib/clearSigning/{types,resolvePath,matchDescriptor,decodeForDescriptor,applyFormat,contentHashFormat,builtinDescriptors}.ts`
- Website `lib/clearSigningRegistry.ts`, descriptor route/index cache, committed
  registry snapshot, and registry regression tests.

The pure formatting engine is retained; the browser transport, RPC factory and
React display are adapted to ETH.sh. No extension messaging, wallet settings,
signing, history, fiat-price or EIP-712 review UI is imported.

## Resolution and display

`lib/clearSigning/resolve.ts` fetches our same-origin
`/api/clearsigning/descriptor?chainId=...&address=...&kind=calldata&selector=...`.
The registry index refreshes from the fixed upstream public GitHub archive once
a day through the Next Data Cache, with the committed index as a cold-failure
fallback. Includes and archive/descriptor sizes are bounded. Multiple descriptors
for one deployment are disambiguated by selector. No calldata, sender or custom
RPC URL is sent to the registry API.

A matched deployment descriptor wins. On a miss, browser reads can resolve
EIP-1967 implementations/beacons, Safe proxies (with a singleton check), and
EIP-7702 delegation. The implementation deployment is checked before the current
address is appended to a cloned descriptor. Generic ERC-20 transfer/approve,
Safe MultiSend and address-bound WalletChan profiles remain fallback formats.

Address and transaction modes retain the decoded request's exact target/network;
transaction mode also supplies its sender and native value. Bare bytes can show
generic formats without guessing a token address or network: amounts stay in
base units. Snapshot examples include their original transaction envelope and a request-keyed
clear-signing cache, including nested results, token metadata and known misses.
A non-null `ExampleSnapshotContext` suppresses all live descriptor/name/token
lookups, even for entries absent from that cache. The Safe example contains the
registry summary and nested MultiSend/ERC-20 summaries. The Zora mint has no
registry descriptor and caches `null`; it shows only the regular tree.

To refresh explicitly with the dev server running, use `pnpm exec vitest run
--config vitest.capture-clear-signing.config.ts` (optional
`CLEAR_SIGNING_CAPTURE_ORIGIN`). The capture uses the shared formatter and public
registry/explorer metadata, validates implementation deployment binding, and
writes both snapshots only after the complete capture succeeds. It never invents
example-specific descriptors.

Runtime guards, required paths, hidden assertions and ABI decode must pass.
Token symbol/decimals use `getPublicClient` and the selected chain's RPC after
saved custom networks are ready. Unknown tokens show raw units and their address.
Nested calls recurse to depth three, with raw bytes as the fallback. Packed
MultiSend delegatecalls stay in the regular decoder rather than being presented
as direct calls. Addresses link to our Contract Explorer and use shared name
resolution. Amounts retain full precision, including an accessible raw-value
hover/focus disclosure for unlimited allowances.

`components/ClearSigning/ClearSigningSummary.tsx` keys asynchronous state to the
payload and custom-RPC revision, so a previous request cannot decorate a new one.
The component is loaded dynamically and does not block the normal decoder.

Run `pnpm test:clear-signing`, `pnpm exec vitest run --config
vitest.decoder-metadata.config.ts`, and `pnpm exec tsc --noEmit` for changes here.

## Tx page

The Tx page renders the same clear-signing component beside its complete transaction form,
with native Value above the calldata editor. A 400ms debounce avoids resolving every
keystroke. Preview state is bound to the current calldata, resolved recipient,
network, sender and native value. An empty recipient means deployment and does
not synthesize a contract target. The decode modal and wallet request modal share
`components/decodedParams/CalldataTree.tsx` with the decoder; no legacy tree is
retained. `vitest.tx.config.ts` covers editor preview/envelope and modal wiring.

A disconnected Tx form may opt into `allowMissingSender`: ordinary `@.from`
address display rows explicitly say “Connect wallet to set sender”. No sender
address is fabricated. Explicit required paths and hidden `mustMatch` assertions
continue to suppress a descriptor when the missing sender is necessary to it.
Other callers retain strict envelope validation.

The Tx page uses inline status beneath the primary action rather than toasts.
Network mismatches require an explicit Switch to {network} action before Send.
The live wallet chain is checked again after recipient resolution, viem requests
include the target chain, and receipt tracking uses the same pinned chain ID.
A requested chain from the URL is never silently replaced by the wallet chain.
