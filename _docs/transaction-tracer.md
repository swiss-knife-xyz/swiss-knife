# Transaction tracer

Issue: https://github.com/swiss-knife-xyz/swiss-knife/issues/105

Route: `/calldata/trace` locally; `https://calldata.eth.sh/trace` after deployment.

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
require an ABI. Returns require canonical input/output matches against a known
ABI; they are never guessed from input signatures. The ABI control accepts JSON
ABIs and Solidity function/event/error declarations and re-decodes affected calls.
Overrides are local to the current trace.

Three workers decode the first 200 visible frames automatically. Opening more
branches schedules their frames; selecting a queued frame gives it priority.
Decode all explicitly schedules larger traces. Abandoned trace queues stop
launching work; old results cannot overwrite a new trace or ABI override. Event
decoding is capped at the first 200 logs per frame; the inspector can still show
all raw logs, 50 at a time. The inline timeline shows the first 50 logs per frame.

## Trace fetching and imports

- Requests `debug_traceTransaction` with `callTracer`, `withLog: true` and a
  20-second tracer timeout through the shared public client. Saved settings load
  first; RPC chain identity is checked before tracing. Saved RPCs remain direct
  browser requests with no public fallback, and are never sent to a server proxy.
- Pasting recognized explorer links selects the network and starts one trace.
  The shared parser matches registry explorers and alternative explorer-directory
  templates exactly; ambiguous multi-chain URLs are rejected. No explorer URL
  needs to be fetched to detect the chain. Bare hashes use the selected network.
- Imports Geth/Anvil callTracer objects, JSON-RPC envelopes and ETH.sh exports.
  Exports preserve network/transaction context. Raw imports without context use
  the selected network for ABI lookup. The demo supplies explicit synthetic ABIs
  and demonstrates decoded reads, transfers, custom errors and events.
- Limits: 8 MiB, 5,000 calls, 64 nested levels, 10,000 logs. Cancellation discards
  the response; it cannot undo node work that has already started.

A network in the selector does not guarantee trace support or historical state.
No new guaranteed public tracing service has been enabled. Use a trace-capable
RPC or import. Gas values are provider-supplied inclusive frame values; ERC-20
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

During live QA, the configured explorer source API was unavailable and USDT's
Sourcify response was a partial match. The existing exact-match verification
policy was preserved. The live trace still rendered signature-inferred inputs;
unknown returns/events remained raw until an ABI was supplied.
