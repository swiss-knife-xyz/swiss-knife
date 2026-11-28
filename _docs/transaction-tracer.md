# Transaction tracer

Issue: https://github.com/swiss-knife-xyz/swiss-knife/issues/105

Route: `/trace` locally; `https://trace.eth.sh/` after deployment.

Registered as its own developer tool in navigation and crawler discovery. Legacy
`calldata.eth.sh/trace` links redirect permanently with their query parameters;
local and preview `/calldata/trace` links redirect to `/trace` on the same origin.

## Decoding and presentation

Visible execution frames decode automatically. Each row shows the function,
named arguments and return values, or a decoded revert. Expand/collapse is
independent from row selection. The Parameters toggle opens full calldata-decoder
input/output trees inside the execution tree. The selected-call inspector defaults
to decoded values; Raw reveals exact bytes. No separate Decode action is required.

The shared `decodeAbiValues` helper in `lib/decoder.ts` produces the same `Arg`
model for returns and events that inputs use. Tuples, arrays, nested bytes,
large integers and indexed event hashes retain their types. `CalldataTree` handles
the presentation throughout. Its raw-byte disclosure targets are unique across
multiple embedded trees. Bulk trees suppress background address/ENS requests;
the selected inspector keeps normal address controls.

Events render between child calls using callTracer log positions. Unknown events
remain raw; missing positions are labelled rather than assigned an invented order.
Successful descendants of failed ancestors are marked rolled back. A caught child
failure does not mark a successful parent failed. Geth may omit reverted logs.

`createTraceDecoder` caches ABIs, selectors and equivalent frames per trace. It
follows same-input DELEGATECALL forwarding paths to the code address executed in
that trace. Input inference is marked; ambiguous matching selector collisions
require an ABI. Known return types require canonical input/output matches against
their ABI. Without a matching ABI, the shared ABI-encoding guesser can infer return
values such as padded addresses. The call tree marks inferred returns with `~`;
the inspector uses standard typed controls and Decoded/Raw tabs preserving the
exact original return bytes.
Input signatures never establish return types; malformed data, opaque hashes and
deployed bytecode stay raw. The ABI control accepts JSON
ABIs and Solidity function/event/error declarations and re-decodes affected calls.
Overrides are local to the current trace.
The inspector's Decoded/Raw modes use tabs. A compact gear popover contains the ABI
editor and Apply button; the return values retain their own Decoded/Raw tabs.

Three workers decode the first 200 visible frames automatically. Opening more
branches schedules their frames; selecting a queued frame gives it priority.
Decode all explicitly schedules larger traces. Abandoned trace queues stop
launching work; old results cannot overwrite a new trace or ABI override. Event
decoding is capped at the first 200 logs per frame; the inspector can still show
all raw logs, 50 at a time. The inline timeline shows the first 50 logs per frame.

## ABI source fallback

The shared explorer/Sourcify lookup remains first. If it fails or exceeds
10 seconds, the tracer tries the fixed Blockscout provider URL from the existing
verification provider catalog (`lib/verification/networks.json`). It fetches no
saved explorer or RPC URLs. Requests omit credentials, reject redirects, time out
after 8 seconds, and stream at most 4 MiB.

Only records explicitly marked fully verified are accepted. Partial verification,
changed bytecode, bytecode twins, blueprint records and malformed ABIs are rejected.
The decoding provenance names Blockscout. ABI lookup results are still cached per
trace and bound to the executed code address. The shared metadata API accepts
Sourcify `exact_match` and `match` records with a runtime bytecode match for the
requested chain/address. Its verification metadata preserves the match quality;
missing runtime matches and incomplete source/ABI payloads remain rejected.

## Trace fetching and imports

- Requests `debug_traceTransaction` with `callTracer`, `withLog: true` and a
  20-second tracer timeout. zkSync omits its unsupported log option and returns
  calls without Geth log enrichment. Saved settings load first; RPC chain identity
  is checked before tracing. Saved RPCs remain direct browser requests with no
  public or hosted fallback, and are never sent to a server proxy.
- Built-in chains whose public RPCs failed tracing use `POST /api/trace` first;
  other explicitly mapped chains try it after a public failure. Routing/slugs are
  in `data/networks.ts`. The browser submits only `{chainId, hash}` and receives a
  normalized TraceDocument. The server uses `ALCHEMY_API_KEY`, fixed provider
  hosts/methods, bounded streams/timeouts, same-origin validation and per-process
  rate/concurrency gates. It never returns upstream credentials or raw provider
  errors. Missing configuration allows public fallback; provider availability
  depends on enabled networks and plan. No user RPC URL is accepted.
  Configure the private key locally and in each Vercel environment; never reuse
  it in `NEXT_PUBLIC_MAINNET_RPC_URL` or other browser-visible variables.
- Pasting recognized explorer links selects the network and starts one trace.
  The shared parser matches registry explorers and alternative explorer-directory
  templates exactly; ambiguous multi-chain URLs are rejected. No explorer URL
  needs to be fetched to detect the chain. Bare hashes use the selected network.
- Transaction links use `?tx=0x…&chainId=1`. Opening a link traces automatically
  after saved RPC settings load. Form edits update these parameters without
  submitting; imported views remove the transaction link. Other URL parameters
  are preserved.
- Imports Geth/Anvil callTracer objects, JSON-RPC envelopes and ETH.sh exports.
  Exports preserve network/transaction context. Raw imports without context use
  the selected network for ABI lookup. Empty-state cards load captured Ethereum
  traces for a Safe/Compound multicall, reverted Uniswap multicall, Lido staking
  deposit and Zora NFT mint from `app/trace/examples.v1.json`. Their full call
  trees, logs, contract names, ABIs, decoded inputs/returns/events and enrichment
  are local. Example deep links use the same snapshots, with all calls expanded;
  other transactions retain lazy decoding and the normal initial expansion.
  Snapshot-backed inspectors use the decoder's example context to suppress live
  address/string metadata lookups. Explicit ABI overrides can still re-decode
  affected frames without altering the shared fixture.
  Examples show the normal result skeleton for 450 ms before revealing local
  data. Reset/cancellation invalidates this delayed reveal like a live request.
  Regenerate with `pnpm exec tsx scripts/captureTraceExamples.ts <RPC URL> <cache dir>`.
  Capture checks trace logs and success/revert status against the receipt and
  records its source/block/hash provenance. No RPC credentials enter the fixture.
- Limits: 8 MiB, 5,000 calls, 64 nested levels, 10,000 logs. Cancellation discards
  the response; it cannot undo node work that has already started.

The hosted request body is:

```json
{"chainId": 8453, "hash": "0x<64 hex characters>"}
```

A successful response is `{version: 1, chainId, transactionHash, call}` with
normalized nested `calls` and `logs`. Failures return `{error}` with an appropriate
HTTP status. Unconfigured/unsupported hosting also returns `unavailable: true` so
the client can try its public endpoint. This endpoint requires a matching Origin
header; it is the trace page's transport, not an arbitrary RPC relay.

A network in the selector does not guarantee trace support or historical state.
`rpc_modules` reports namespaces, not individual tracing methods or provider-plan
permissions. The actual `debug_traceTransaction` request checks support without a
separate probe. Nested RPC error codes distinguish unavailable methods, unsupported
callTracer, access restrictions, rate/provider limits, missing historical state,
unknown transactions and timeouts. Displayed errors do not include endpoint URLs.
Failed RPC traces offer Tenderly and Phalcon links for the same hash and chain,
using the explorer directory's explicit provider mappings. Unsupported networks
have no guessed links; editing inputs or switching networks clears stale links.
The error row places external tracing links at the right, with a centered blue
**Use your custom RPC** button beneath it. This opens the shared RPC editor on the failed
chain and retries the same transaction after a verified save. Saved-RPC outages
also show the shared edit/public-RPC recovery notice used by other tools.
Hosted tracing is best-effort; use a custom trace-capable RPC or import if neither
provider works. Gas values are provider-supplied inclusive frame values; ERC-20
amounts default to Raw base units unless the user chooses a conversion.

## Reference review

These references informed behavior; their implementations were not copied.

| Reference | What was checked | Applied here |
| --- | --- | --- |
| [OpenChain call component](https://github.com/openchainxyz/openchain-monorepo/blob/main/frontend/components/tracer/trace/CallTraceTreeItem.tsx) (MIT monorepo) | Inline input/return expressions, separate typed parameter trees, error decoding, precompiles | Inline decoded values, typed input/output trees, decoded reverts |
| [Otterscan output decoder](https://github.com/otterscan/otterscan/blob/develop/src/execution/transaction/decoder/OutputDecoder.tsx) (MIT) | Decoded, raw and custom output views | Decoded/raw inspector and per-contract ABI override |
| [ApeWorX evm-trace](https://github.com/ApeWorX/evm-trace) (Apache-2.0) | Call-tree normalization, log ordering, reverted-log caveats | Explicit ordering and rollback semantics |
| [Tenderly execution trace](https://tenderly.co/blog/changelog/debugger-improved-visibility-granularity/) | Event visibility in the execution timeline | Positioned decoded events, optional log visibility |
| [Geth callTracer](https://geth.ethereum.org/docs/developers/evm-tracing/built-in-tracers) | Provider payload and tracer configuration | Geth/Anvil adapter and validation |

This is a decoded call-trace viewer, not yet a complete source debugger. Parity
trace adapters, dedicated precompile decoders, opcode/source stepping, storage
and balance diffs, token-decimal enrichment and exclusive-gas profiling remain
follow-ups. No claim of market-wide feature parity has been established.

## Verification

Use `.nvmrc` (`nvm use`), then:

```sh
pnpm exec vitest run --config vitest/vitest.tracer.config.ts --testTimeout 30000
pnpm test:reverts
pnpm test:calldata-editor
pnpm test:networks
pnpm exec tsc --noEmit
```

Coverage includes exact large values, tuples/arrays/nested return bytes, custom
errors, dynamic indexed event hashes, historical delegation targets, selector
collisions, ABI override invalidation, bounded workers, stopped queues, and unique
raw disclosures in embedded trees. Browser checks cover inline decoded input,
output, custom errors and events, full parameter trees, decoded/raw switching,
explorer paste flow, mobile layout, JSON round trips and cancellation.

The new tracer files pass installed Next.js flat lint rules. The existing shared
parameter components have pre-existing effect-related lint errors; their full
regression suites are run when extending their opt-in display controls.

Earlier live QA used an exact-match-only Sourcify policy. The shared source API
now also accepts Sourcify bytecode matches when explorer lookup fails, so those
ABIs can decode inputs, outputs and events without a manual override.

The Blockscout fallback was checked in the browser with a synthetic deposit-contract
STATICCALL, a forced primary-provider failure, and the live Blockscout API. One
fallback request supplied the fully verified ABI, decoded the input/return value,
and displayed Blockscout provenance. Partial USDT records remained rejected.
