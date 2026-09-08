# LayerZero OFT Bridge (runtime sends)

No OFT deployment for your token yet? Run the companion skill `layerzero-oft-launch` ONCE first — it deploys the adapter/OFT pair, wires peers + DVN/executor config, and seeds the destination pool. This skill is the daily driver for tokens already wired up.

## Discovery: given an arbitrary token, does an OFT already exist? (run FIRST for unknown tokens)

Check in this order — stop at the first hit:

1. **Local records**: the Known deployments section below, the user's /deployments/_-oft-addresses.md files, and /.memory/project\__\_oft.md entries.
2. **LayerZero metadata OFT list** (curated registry of major OFTs): `curl https://metadata.layerzero-api.com/v1/metadata/experiment/ofts/list?symbols=<SYM>` or `?addresses=<addr>`. Returns per-symbol deployments with type OFT vs OFT_ADAPTER + innerTokenAddress. ⚠️ CURATED AND INCOMPLETE — skill-deployed OFTs (e.g. our BNKR adapter) are NOT listed. A hit is proof of existence; a miss proves nothing.
3. **On-chain probes** (authoritative, all verified 2026-07-12):
   - `oftVersion() view returns (bytes4 interfaceId, uint64 version)` on a candidate contract → any OFT/adapter answers (BNKR adapter returns 0x02e49c2c, 1); a plain ERC-20 REVERTS (canonical BNKR does). This is the definitive "is this contract LZ-bridgeable" test.
   - `approvalRequired() view returns (bool)` → true = OFTAdapter (lock/unlock, needs ERC-20 approve), false = native OFT (mint/burn, no approval).
   - `token() view returns (address)` → the canonical token an adapter wraps (an OFT returns itself).
   - `peers(uint32 eid) view returns (bytes32)` → nonzero means the lane to that eid is wired. Probe the destination eid you care about.
   - Final gate: quoteSend with the type-3 options below must return a fee cleanly. Wired peers + clean quote = ready to bridge.
4. **Caveat — no on-chain token→adapter registry exists.** If the user hands you only a canonical ERC-20 (oftVersion reverts on it), you cannot derive its adapter address from chain state alone. Search the metadata API, the token project's docs/socials, or the explorer (an adapter shows as a contract holding a large token escrow with LZ endpoint interactions). If nothing surfaces, treat the token as NOT wired and route to `layerzero-oft-launch` — but warn the user: only ONE adapter should ever exist per token globally; confirm the project has no official OFT before deploying one.

## Known deployments

### BNKR (deployed 2026-07-12)

- Base adapter (lock/unlock): 0xe4BBB2D00aaC984CccA26ac5AbaFd7de3Afab8Bf — canonical BNKR 0x22af33fe49fd1fa80c7149773dde5890d3c76f3b
- Robinhood OFT (mint/burn): 0x178E54df3D091EE4D0B2534742eF9e3692b76526
- eids: Base 30184, Robinhood 30416. Endpoints: Base 0x1a44076050125825900e736c501f859c50fE728c, Robinhood 0x6f475642a6e85809b1c36fa62763669b1b48dd5b.
- ULN libs — Base: send 0xb5320b0b3a13cc860893e2bd79fcd7e13484dda2, recv 0xc70ab6f32772f59fbfc23889caf4ba3376c84baf. Robinhood: send 0xc39161c743d0307eb9bcc9fef03eeb9dc4802de7, recv 0xe1844c5d63a9543023008d332bd3d2e6f1fe1043.
- Security config (LIVE, both directions, verified by delivered send 2026-07-12): 2 required DVNs, 20 confirmations. Base legs: LZ Labs 0x9e059a54699a285714207b43B055483E78FAac25 + Nethermind 0xcd37CA043f8479064e10635020c65FfC005d36f6. Robinhood legs: Nethermind 0x0ffe02df012299a370d5dd69298a5826eacafdf8 + LZ Labs 0xd01ae6905d48315f7be10c7330aecf8360ef5b12. **Never downgrade to 1/1 — the LZ Labs DVN refuses to attest 1/1 configs and packets stall forever.**
- ⚠️ HISTORY: an earlier config used a WRONG Base "Nethermind" address (0x658947bc7956aea0067a62cf87ab02ae199ef3f3) that reverts DVN_EidNotSupported for eid 30416 — quoteSend bubbled the revert and the lane was bricked until reconfigured (fix txs 0x2ac1d13e..., 0x67afe3eb... on Base, 2026-07-12). Always validate DVN addresses (see DVN validation below).
- Destination pool: BNKR/WETH 1% on Robinhood — 0x559ec27d7dd5512783126cecae5266e6d346abc2 (LP tokenId 97828, NPM 0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3, WETH 0x0bd7d308f8e1639fab988df18a8011f41eacad73).
- Address reference file in user filesystem: /deployments/bnkr-oft-addresses.md — keep it updated when config or pool status changes.
- Observed happy-path delivery time Base→Robinhood: ~90 seconds.

### GITLAWB (deployed 2026-07-13)

- Base adapter (lock/unlock): 0x3308384bc308D09b3Eba9A8F11cC36e993A273A4 — canonical GITLAWB 0x5f980dcfc4c0fa3911554cf5ab288ed0eb13dba3
- Robinhood OFT (mint/burn): 0xd1b0d44E4f6ed940fcC7A9F59Bf30Daf62cCFe3D
- Same eids/endpoints/ULN libs and same 2-DVN security config as BNKR above (set BEFORE first send — first bridge delivered organically in ~90s, no rescue needed).
- Destination pool: GITLAWB/WETH 1% on Robinhood — 0x353C4B52b63a69971128d38F6AFd846760B017FA (LP tokenId 101101, same NPM/WETH as above).
- Address reference file: /deployments/gitlawb-oft-addresses.md

## SendParam struct (OFT v2)

(uint32 dstEid, bytes32 to, uint256 amountLD, uint256 minAmountLD, bytes extraOptions, bytes composeMsg, bytes oftCmd)

- to = recipient address left-padded to bytes32
- amountLD in local decimals (18 for BNKR)
- **minAmountLD (SHARP EDGE, verified 2026-07-12): must be ≤ amountLD truncated to shared-decimal precision: `minAmountLD = amountLD - (amountLD % 10^(localDecimals-sharedDecimals))` = amountLD - (amountLD % 10^12) for an 18/6 token. Compute with BigInt — do NOT hand-truncate digits (an off-by-one digit slip passes eyeball review and reverts). Using raw amountLD (or any value above the truncated amount) reverts SlippageExceeded (0x71c4efed).**
- **extraOptions (SHARP EDGE, verified 2026-07-12): if the OApp has no enforced options set (default for skill-deployed OFTs), empty `0x` REVERTS quoteSend with LZ_ULN_InvalidWorkerOptions (0x6592671c). ALWAYS pass type-3 options: `0x00030100110100000000000000000000000000030d40` (200k gas lzReceive).**
- composeMsg, oftCmd: 0x

## Workflow (source = Base example)

1. If sending FROM the token's home chain via an adapter: ERC-20 approve(adapter, amountLD) first (write_contract). OFT side (mint/burn) needs NO approval. (Not sure which type you have? `approvalRequired()` — see Discovery.)
   - ⚠️ Scanner note (verified GITLAWB 2026-07-13): Bankr's security scan blocks approve() to contracts its cache considers unverified, and the cache LAGS Sourcify/Blockscout — an adapter can show verified on both and still be blocked for a while. Fixes: user whitelists the adapter address, or wait for the cache to catch up and retry. This is a scanner-cache issue, not a verification problem.
2. Quote fee (read_contract on adapter/OFT):
   quoteSend((uint32,bytes32,uint256,uint256,bytes,bytes,bytes) \_sendParam, bool \_payInLzToken) view returns ((uint256 nativeFee, uint256 lzTokenFee) msgFee)
   - quote with the SAME extraOptions + minAmountLD you will send with.
3. Send (write_contract, value = nativeFee in ETH human units):
   send((uint32,bytes32,uint256,uint256,bytes,bytes,bytes) \_sendParam, (uint256,uint256) \_fee, address \_refundAddress) payable
   - \_fee = (nativeFee, 0), refund = sender wallet
4. Track: https://layerzeroscan.com/tx/<source_tx_hash> or GET https://scan.layerzero-api.com/v1/messages/tx/<hash> (poll status.name → DELIVERED, destination.tx.txHash). Typical delivery 1-3 min.
5. Verify arrival: balanceOf(recipient) on destination token (the OFT itself is the ERC-20 on the wrapped chain).
6. REPORT BACK TO THE USER (mandatory): the final summary MUST include the LZ transaction hashes — source send tx AND destination delivered tx — plus the layerzeroscan link, and every relevant contract address labeled with its chain (canonical token + adapter on source; OFT contract on destination — that OFT address IS the token CA on the destination chain; pool address if relevant). Never make the user ask for a CA or tx hash after the fact.

## Reverse direction (Robinhood → Base)

Same flow on the OFT contract: no approval needed (burns own balance), dstEid 30184, fee paid in Robinhood-chain ETH.

## Debugging quoteSend reverts (selector table, all verified)

- 0x71c4efed SlippageExceeded — minAmountLD > dust-truncated amount. Recompute with BigInt.
- 0x6592671c LZ_ULN_InvalidWorkerOptions — empty/malformed extraOptions with no enforced options. Use the type-3 options above.
- 0xd009138a DVN_EidNotSupported — a configured DVN contract doesn't serve this lane (wrong/stale DVN deployment address). Fix the ULN config with validated addresses.
- 0x6c1ccdb5 LZ_DefaultSendLibUnavailable — no send config on fresh route; set executor (configType 1) + ULN (configType 2) on the send lib.
- 0xf6ff4fb7 NoPeer — peers not wired for that eid.
- 0x4c3118d4 LZ_ULN_Verifying — commitVerification attempted under a config that doesn't match the recorded attestation (rescue flow ordering).

## DVN validation (do BEFORE setting/trusting any ULN config)

- Get candidate addresses from https://metadata.layerzero-api.com/v1/metadata → `<chain>.dvns` (skip deprecated / lzReadCompatible entries). NOTE: metadata chain keys can be confusing — `robinhood` (eid 30416) is mainnet, `robinhood-testnet` (eid 40451) is not; always match by eid, not by name.
- Sanity-probe each DVN on-chain: `getFee(uint32 dstEid, uint64 confirmations, address sender, bytes options) view returns (uint256)` with options=0x. A DVN that serves the lane returns a fee; a wrong deployment reverts DVN_EidNotSupported (0xd009138a).
- The same entity has DIFFERENT contract addresses per chain and sometimes multiple deployments per chain — never copy a DVN address across chains or from memory without the getFee probe.
- requiredDVNs array must be sorted ascending.

## Stuck packet? (WAITING > ~10 min)

1. Check config on layerzeroscan message page: if inboundConfig shows requiredDVNCount 1 → that's the problem (LZ Labs DVN blacklists 1/1). Also getFee-probe every configured DVN (above) — a DVN_EidNotSupported DVN will never attest. Fix config via endpoint.setConfig — NEW sends will then flow.
2. Packets already sent under the old config keep their assigned DVN set. If they stay stuck, owner rescue: temporarily setConfig destination receive ULN to requiredDVNs=[owner wallet] (1/1 with yourself), from that wallet call verify(packetHeader, payloadHash, 20) on the ReceiveUln302, then commitVerification(packetHeader, payloadHash), then RESTORE the 2-DVN config immediately.
   - packetHeader = first 81 bytes of encodedPayload from the source PacketSent log; payloadHash = keccak256(guid ++ message); guid = keccak256(nonce ++ srcEid ++ sender32 ++ dstEid ++ receiver32).
   - IMPORTANT ORDERING: the verify() attestation must be recorded while the rescue config is ACTIVE, and commitVerification must run while it is STILL active. Do verify → commitVerification back-to-back, THEN restore. If commitVerification reverts 0x4c3118d4 (LZ_ULN_Verifying), the attestation and the active config don't match — re-run verify under the current config.
3. After commit, if execution doesn't auto-fire, call endpoint.lzReceive((srcEid, sender32, nonce), receiver, guid, message, 0x) from any wallet.

## Gotchas

- Dust below 10^12 wei (6 shared decimals on an 18-decimal token) is stripped; only the truncated amount is debited/minted.
- nativeFee is chain gas token (ETH both sides here). Keep ~2x quoted fee as buffer in wallet.
- Third parties can and will bridge through the adapter (it's permissionless). Their stuck packets block the shared nonce ordering only if ordered execution is enabled (it is not by default — unordered).
