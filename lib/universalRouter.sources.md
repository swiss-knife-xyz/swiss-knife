# Universal Router decoding

Schemas reviewed 2026-11-22. “V3” refers to the older Universal Router generation,
not an individual V3 swap command; V4-capable routers also execute V2/V3 swaps.

Primary sources:

- [V1.0 command mask and NFT commands](https://github.com/Uniswap/universal-router/blob/v1.0.0/contracts/libraries/Commands.sol)
- [V1.6 commands](https://github.com/Uniswap/universal-router/blob/v1.6.0/contracts/libraries/Commands.sol)
- [V1.6 dispatcher and input layouts](https://github.com/Uniswap/universal-router/blob/v1.6.0/contracts/base/Dispatcher.sol)
- [V4-capable commands and dispatcher](https://github.com/Uniswap/universal-router/tree/3be05ae044039af7610414da0ac36e4944eea566/contracts)
- [V4 actions, swap structs, PathKey, position manager](https://github.com/Uniswap/v4-periphery/tree/c6e4754dab11bd38c6f08ac51c3c868569e93d64/src)
- [Official SDK command schemas](https://github.com/Uniswap/sdks/blob/74827a8ad193277ffe42a31635fd77a53f48ae71/sdks/universal-router-sdk/src/utils/routerCommands.ts)
- [Official SDK V4 schemas and 2.1.1 price-limit extensions](https://github.com/Uniswap/sdks/blob/74827a8ad193277ffe42a31635fd77a53f48ae71/sdks/v4-sdk/src/utils/v4Planner.ts)

Rules:

- Decode both execute overloads before signature lookups, with canonical ABI
  roundtrips. This identifies an encoding layout, not a verified router deployment.
- Match the complete payload against separate legacy NFT and V4 command schemas.
  Never choose a generation just because an opcode appears in one table. Shared
  swap commands accept the original and extended per-hop-price layouts.
- Preserve the allow-revert flag and legacy reserved-bit interpretation. Keep
  commands and inputs at their original indices, including unknowns and mismatches.
- V3 packed paths become execution-ordered hops; exact-output encoding is reversed.
  V4 paths remain typed PathKey tuples with currencies, fee, tick spacing and hooks.
- Decode V4 swap actions, position-manager unlock actions, nested subplans and
  position-manager calldata. Annotate actions not supported in their context.
- Keep Permit2 signatures, hook data, hashes and bridge messages opaque. Only
  explicit external-call fields are recursively interpreted as calldata.
- Unknown fork commands (including 0x2c/0x33/0x36 in issue #161) retain generic
  nested ABI guesses with heuristic metadata in the decoded JSON. Known but
  malformed commands remain raw.
- ABI layouts cannot prove a deployment version. Ambiguous matches remain raw;
  callers may explicitly constrain `routerVersion` to v3 or v4. Conflicting
  generation evidence is reported, not silently treated as one router.
- Roundtrips are deliberately conservative: noncanonical offset/padding/trailing
  encodings that a particular contract might tolerate are shown raw.
- The existing ten-level recursion limit applies across protocol and generic
  decoding. Unsupported future/fork commands remain visible as raw bytes.
