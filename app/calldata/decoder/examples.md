# Curated decoder examples

A card selection uses the checked-in Ethereum mainnet snapshot. A 450 ms presentation-only skeleton precedes the saved result; it performs no lookup and restarts for repeat Decode or a new selection. Editing the input, changing the network, switching input tabs or unmounting cancels the pending reveal. Decode reuses it while the selected input and chain match. Editing the transaction, changing chains or switching input tabs exits snapshot mode. Typing or pasting a transaction in the form runs the live decoder, including when it happens to match a curated example. Opening or reloading a link with the exact curated explorer URL, or its hash and explicit chain ID, opts into the saved result. A different explicit chain ID bypasses the snapshot.

Sample results and events render using the decoder's existing tree. Address tags and URL previews come from the capture. Local address-book labels still apply. Missing entries have no automatic remote fallback. ENS names and avatars were not captured. Links to explorers and the original IPFS URLs remain available as user actions.

## Refresh

Run the capture from the repository root with the existing `tsx` installation, the ETH.sh app origin and a scratch directory.

```sh
NODE_OPTIONS=--max-old-space-size=640 node_modules/.bin/tsx \
  scripts/captureDecoderExamples.ts http://localhost:3000 /path/to/scratch
```

The script feeds the verified public fixture transactions and receipts into the current `decodeRecursive` and `decodeEvents` functions. It resolves verified ABIs via the existing ETH.sh route with a verified Blockscout fallback. Chain and hash checks, required nested calls and expected events must pass before the JSON is written. Bigints are stored as tagged decimal strings and rehydrated when loaded. The stage status, timestamp, public source and digest record the inputs and available enrichment. ABI digests cover the ABI, contract name and proxy implementation fields provided to the decoder. IPFS asset digests cover the raw bytes. The output excludes full source, ABI responses and provider configuration.

After reviewing the scratch output, replace `examples.v1.json` and, if present and referenced, `public/decoder-examples/zora-20000.jpg`. A partial enrichment capture leaves that entry absent. If metadata gateways are unavailable, the verified fixture's metadata fields can be used with explicit fixture provenance.

The bundled JPEG was originally downloaded from the Pinata IPFS gateway and checked against the mint calldata content hash. A refresh may reuse this file after verifying that digest again.
