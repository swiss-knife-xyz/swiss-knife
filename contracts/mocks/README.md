# Permissionless mock token artifacts

**Mocks only.** Anyone can mint to any address. There is no owner, cap, backing,
upgrade hook or access control. Even mainnet deployments are public mocks, not
assets with promised value. `MOCK ` / `MOCK_` labels are enforced in constructors;
ERC1155 uses fixed `MOCK ERC1155` / `MOCK_1155` labels. URI contents are external,
unverified and may change, even though URI strings cannot be updated.

Wrappers inherit the pinned **OpenZeppelin Contracts 5.0.2** implementations of
ERC20, ERC721 and ERC1155 (MIT). Sources: https://github.com/OpenZeppelin/openzeppelin-contracts/tree/v5.0.2
Small wrappers add permissionless mint and constructor metadata / ERC20 initial
supply only; this is **not** an independent smart-contract audit. Human release
review remains required before production use.

## Reproduce without connecting a wallet

Use the project's frozen installed dependencies: solc **0.8.28**
(`v0.8.28+commit.7893614a`), optimizer enabled with **200 runs**, **Paris** EVM,
IPFS bytecode metadata hash. Paris avoids requiring PUSH0/Cancun opcodes.

```
pnpm build:mock-token-artifacts
pnpm exec tsx scripts/buildMockTokenArtifacts.ts --check
pnpm exec tsx --test lib/mockTokens.test.ts lib/mockTokenRouting.test.ts
pnpm test:mock-tokens
```

The generator refuses other compiler/OZ versions, recursively embeds the exact
imported sources, and emits `lib/mockTokens.generated.ts` and the downloadable
`public/mock-tokens-standard-input.json`. Do not hand-edit generated artifacts.
No runtime compiler, arbitrary source upload, proxy or third-party deployment
service is used. Each user's wallet submits a direct CREATE with native value 0.

For **offline bytecode execution** (no RPC, private keys or signatures), provision
`@ethereumjs/evm@10.1.0` and `@ethereumjs/util@10.1.0` in a private tooling directory,
then run:

```
MOCK_EVM_PACKAGE_JSON=/absolute/tooling/package.json pnpm test:mock-tokens-evm
```

This optional fixture tool is deliberately not a production/test dependency:
it leaves the app's production importer and lockfile unchanged. It executes all
three generated constructors and deployed bytecode on Paris and Prague; checks
forced names, ERC20 exact initial supply/decimals and third-party mint, standard
transfers/approvals, NFT interfaces/metadata, duplicate ERC721 IDs, zero-recipient
reverts and ERC721/ERC1155 safe-receiver rejection. It does not exercise live
wallet software or prove every supported network's provider availability.

On constrained workers, wrap **every heavy install/check/build** with the shared
batch flock and memory-limited scope (one worker, 600 MB Node heap):

```
flock /path/to/shared/.heavy-check.lock \
  systemd-run --user --scope -p MemoryMax=1200M -p MemorySwapMax=128M \
  env NODE_OPTIONS=--max-old-space-size=600 <command>
```

## User flow / limits

`https://eth.sh/mock-tokens`: no deployment network defaults from the wallet.
Supported testnets: Sepolia, Base Sepolia, Arbitrum Sepolia. Mainnets: Ethereum,
Base, Arbitrum One, OP Mainnet, Polygon. These all exist in the site's current
wallet selector. Network switches are user initiated, never automatic.

Estimation is read-only; deployment requires a matching connected account/network,
a fresh review (60 seconds), public mock consent and a second mainnet real-gas
consent. Quotes show a 20% execution-gas buffer and explicit fee caps. Extra L2
data / L1 publication and other network fees may apply; the wallet is the final
fee authority. This is not gas sponsorship or a guaranteed total. Insufficient
reviewed execution funds fail closed; providers/wallets also validate affordability.

A consumed review cannot automatically retry after a rejected/uncertain wallet
response. Keep/check the wallet or transaction explorer before another explicit
deployment. Receipt checks are manual and retain the original chain/hash;
`submitted` is not `confirmed`. State is in memory, not URL or browser storage,
and is lost on refresh. Smart-account/Safe workflows that do not return a mined
CREATE transaction receipt with `contractAddress` may require wallet-specific
recovery; a hash alone does not claim a deployed token address.

No NFTs are initially minted. ERC20 initial supply is expressed as decimal whole
tokens, fixed at 18 decimals, converted exactly to uint256 base units. The NFT
metadata URI is optional, immutable, not fetched and limited to HTTPS/IPFS/Arweave.
ERC721 appends the decimal token ID; ERC1155 uses the standard 64-digit lowercase
hex `{id}` replacement. All mint recipients must satisfy OZ's normal checks.

The UI supplies ABI download, complete standard JSON and saved constructor-arg
hex for manual verification. It does not publish source automatically. An
unverified explorer may need the downloaded ABI or manual verification before
showing complete mint controls. Mint signatures are documented in the result.

**Development must never sign or deploy on a live chain.** Only use injected
wallet/receipt fixtures and the offline EVM fixture. Do not connect a funded
wallet to smoke-test this tool. Local branch/commit only; no publication implied.
