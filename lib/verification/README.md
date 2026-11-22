# Cross-explorer verification

`/explorer/verify` imports published Solidity source from Etherscan, Blockscout,
Routescan or Sourcify, normalizes the exact compiler input, and submits it to
selected destination providers. A different destination network/address and its
constructor arguments can be supplied explicitly. A detected proxy implementation
can be opened as a separate verification; proxy linking is not performed implicitly.

## Configuration

- `ETHERSCAN_API_KEY`: server default for Etherscan source reads and submissions.
- `BLOCKSCOUT_API_KEY`, `ROUTESCAN_API_KEY`: optional server defaults.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`: required in production
  for shared jobs, submission locks, and provider request budgets.
- `VERIFICATION_JOB_STORE=redis`: opt into Redis during local development.
  Development otherwise uses a bounded in-memory store.

Entering a user key switches that verification to browser-only mode. Imports,
preflights, submissions and polling call explorer APIs directly using the shared
provider adapters. User keys remain in React memory only: no ETH.sh requests,
storage, server jobs or server-configured key fallback. The backend rejects all
key-bearing payloads. CORS/network failures are shown locally without proxying.
Browser-only jobs and provider GUIDs stay in memory and reset on refresh.

Without user keys, the server-configured flow is unchanged. Browser recovery
stores only its opaque job ID, source chain ID and source address. Reviews expire
after ten minutes; submitted server jobs remain checkable for 24 hours.

Redis failures stop processing; production never falls back to a different store
that could replay an already consumed submission. Submission intent is saved
before the upstream POST. Unknown delivery can be reconciled by checking published
source but cannot be automatically resubmitted. Explicit failed submissions can
be selected and retried. Each provider has an independent result and budget.

Sourcify may forward verification to external providers itself. We submit directly
selected providers first and Sourcify last, and recheck existing verification before
each submission. A Sourcify success is not reported as success on another provider.

## Provider coverage

`networks.json` is a reviewed snapshot of official provider registries, not a
claim that every compiler or API plan works on every listed network. The UI
checks provider availability for the actual contract and reports missing keys,
provider rejection, throttling and unavailable endpoints per destination.

Refresh with `npx tsx scripts/updateVerificationNetworks.ts`, then review the diff
and test changed instances. Sources:

- https://api.etherscan.io/v2/chainlist
- https://sourcify.dev/server/chains
- https://github.com/blockscout/chainscout/blob/main/data/chains.json
- https://routescan.io/chains (API-enabled networks only)

Only registered HTTPS explorer hosts are recognized in pasted URLs. API fetch URLs
are built from the registry and validated chain/address values, never caller URLs.
Source paths and compiler settings are preserved without flattening. Incomplete
source, URL-only imports, ambiguous compilation targets and unsupported compilers
are rejected. Currently supports solc Solidity; Vyper, Solar, zkSync and Stylus need
compiler-specific adapters rather than being sent as Solidity.

## Checks

```
npx tsx --test lib/verification/*.test.ts
npx vitest run --config vitest.verification.config.ts
npx tsc --noEmit
```

Tests cover all four source families and all cross-family destinations, same-chain
and different-deployment targets, exact compiler settings, independent failures,
consent and deployment binding, worker recovery, idempotency, uncertain delivery,
provider throttling, bounded transport, URL allowlists and stale UI responses.
External submission tests use fixtures. Read-only imports/preflights can be tested
with Ethereum WETH at `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`.
