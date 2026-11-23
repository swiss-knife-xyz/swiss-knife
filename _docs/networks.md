# Shared networks

`data/networks.ts` owns network definitions, display names, icons, explorer metadata,
ERC-3770 aliases, retirement filtering, and RPC endpoint policy. `data/common.ts`
re-exports it for compatibility; add new configuration to `networks.ts`.

## Adding or updating a network

1. Reuse a viem definition in `chainDefinitions`, or define a missing chain in
   this module. Chain IDs are the identity; aliases must refer to the same ID.
2. Add local artwork in `chainIcons/` and map it in `iconFamilies`.
3. Set public endpoint overrides in `publicRpcOverrides` when needed. Add a
   `NEXT_PUBLIC_*` environment override in `chainIdToCustomRpcUrl` if supported.
   Client-configured endpoints are public to the browser; server credentials must
   stay in server modules.
4. Update the relevant tool's support mapping only when that tool supports the
   network (verification providers, Uniswap deployments, bridge support, etc.).
5. Retire networks in `data/retiredChains.ts`; shared lists exclude those IDs.

`directoryNetworks` holds existing directory-only identities. These do not
implicitly enable RPC tools or wallet switching. API-backed tools may also have
provider-only networks; use their supplied identity as a fallback for unknown IDs.

## Selectors

Use `NetworkSelect` for standard network dropdowns. Flat option lists automatically
use Mainnets and Testnets groups; empty groups are hidden. Explicit provider groups
retain their ordering. Saved Custom networks always appear above them:

```tsx
const [chainId, setChainId] = useState(1);
<NetworkSelect
  ariaLabel="Source network"
  chainId={chainId}
  onChange={setChainId}
  networks={[1, 8453]}
/>;
```

Omit `networks` for the full RPC-supported catalog. Pass an explicit allowed list
for protocol/provider restrictions. The component owns no selected-network state,
wallet switching, fetching, URL state, or persistence. Each tool retains its own
state and side effects. Existing option-shaped form/URL state can use
`selectedOption` / `setSelectedOption` without changing serialization.

Use `getNetworkOptions` or `getGroupedNetworkOptions` when supplying grouped or
provider-specific options. Known IDs get their shared name and icon; unknown
provider networks retain their supplied name. Preserve provider slugs in the API
support mapping and translate them at the API boundary (see CoW verification).

Wallet switching remains with RainbowKit. Specialized bridge pickers and directory
cards retain their behavior but use shared identity helpers. Network filters that
only filter a directory should not change the wallet or another tool's network.

## RPC access

- `getPublicClient(chainId)` for normal viem reads.
- `getRpcTransport(chainId)` for wagmi transports, sharing the same endpoint order
  and fallback policy as public clients.
- `getEthersProvider(chainId)` for integrations that require ethers; it uses the
  same endpoint policy. Browser reads delegate to the saved-settings-aware viem
  client; server reads use a fallback provider with quorum 1.
- `getRpcUrlsForChain(chainId, "public")` for the read-only RPC Console allowlist.
  This deliberately excludes environment-configured endpoints.
- Explicit user-entered RPC testing and server-only credentials remain explicit
  exceptions. Do not use a guessed/default network when an ID is unsupported.

Known RPC-backed wallet networks are included in the registry; wallet ordering is
kept in `data/chains.ts`. Tool support lists reference network IDs and do not
redefine chain metadata.

## Verification

`pnpm exec vitest run --config vitest.networks.config.ts` covers shared identity,
retirement filtering, provider restrictions, independent selectors, name/ID search,
configured endpoint precedence, public-only console endpoints, and RPC fallback.
Run the affected tool suites and TypeScript checks when changing the registry.

## User-saved chains and local forks

`NetworkSelect` includes **Add chain** and **Manage** actions. The modal saves the
name, numeric chain ID, RPC URL, native symbol/decimals, and optional explorer URL.
Pasting an RPC URL automatically reads and fills its chain ID, with cancellable
loading indicators on both fields. Saved custom chains appear first in their own
dropdown group. It verifies `eth_chainId` before writing. A chain ID
can have one saved configuration; replacing a built-in ID requires explicit
confirmation. Its custom endpoint has **no public fallback**, even for IDs such
as Ethereum's `1`. Removing the saved entry restores the built-in definition.

- `lib/customChains/model.ts`: versioned schema, validation, RPC identity check,
  shared storage reducer, and allowed parent origins.
- `lib/customChains/storage.ts`: local storage on the hub origin, authenticated
  iframe messages elsewhere, and cross-window change notifications.
- `lib/customChains/store.ts`: external React store and browser catalog updates.
- `components/CustomChainModal.tsx`: add, edit, remove, and confirmation UI.
  The shared tool navbar opens this editor as a right-hand drawer from the
  network icon immediately before Address Book. The homepage omits this action.
  The drawer opens to the saved list; Add/Edit reveals the form, and saving
  returns to the list. Rows show chain identity and override status.
  Managing saved networks here does not change any tool's selected network.
- `app/%5Fstorage/page.tsx`: the actual `/_storage` route. A literal `_storage`
  directory is private in Next.js; the escaped segment exposes the existing hub
  component. This is an internal noindex page, not a public tool. App providers
  must be bypassed in storage frames to prevent recursive initialization.

Production uses `https://eth.sh/_storage`, matching the address-book hub pattern.
Chain data lives under `eth-sh:custom-chains:v1`, independently of the address
book. Messages require the expected iframe source and origin; the hub only serves
HTTPS ETH.sh parents (plus loopback development origins). There is no silent
fallback to per-subdomain storage if the shared hub is unavailable.

Browser RPC requests wait for saved settings before resolving their endpoint, so
an existing-ID fork is honored on a fresh page load. Cached viem clients and wagmi
transports follow endpoint changes. Explorer panels reset only when their own RPC
changes; selected networks remain local to each tool.

Custom RPC Console reads run directly in the browser, with the existing read-method
allowlist, request/response bounds, timeout, and chain-ID verification. **Never pass
user-entered RPC URLs through the server proxy**: its public allowlist must remain
fixed. Protocol and explorer integrations can still be unavailable for a custom
chain; adding a chain does not deploy contracts or add provider support.

For cross-origin local QA, a development-only `NEXT_PUBLIC_CHAIN_STORAGE_ORIGIN`
can select the shared origin (for example `http://localhost:3210` for tools served
on another localhost port). Different `*.localhost` top-level sites may receive
partitioned iframe storage, unlike same-site production ETH.sh subdomains.

## Name resolution

Reuse `resolveNameToAddress` from `lib/nameResolution.ts` (also re-exported by
`utils`) for forward name lookups. It uses the shared mainnet client: ENS names
and subdomains retain viem's ENS/CCIP resolution, `.gwei` uses the GNS universal
resolver, and `.wei` reads the WNS address record with the full namehash. Contract
addresses live in `lib/nameServiceContracts.ts`; the Gwei tool re-exports its
existing resolver constant for compatibility. Missing, expired, zero-address or
failed lookups return `null`. Do not implement separate name resolvers in tools.
