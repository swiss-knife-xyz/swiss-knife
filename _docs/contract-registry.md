# Curated contract discovery registry

`data/contracts/registry.json` stores reviewed deployment identities for explorer
metadata and sitemap discovery. It adds no directory, labels, or other visible UI.
`data/contracts/index.ts` exposes the registry and case-insensitive lookup by
chain ID and address. Network names come from `data/networks.ts`.

## Scope

The initial collection covers Aave V2/V3/V4; Uniswap V2/V3/V4, Universal Router,
Permit2 and UNI; Compound V2/V3; Morpho Blue/Midnight; Curve; Balancer V2/V3;
Pendle; Lido; Sky/Maker; Spark; EigenLayer; Aerodrome; CoW Protocol; 1inch;
Rocket Pool; Ethena; ether.fi; Liquity; PancakeSwap V3; Convex; GMX V2; Fluid;
Frax; Yearn; and selected recognizable tokens.

Coverage is intentionally selective, not an exhaustive list of deployments or a
ranking by current TVL/search volume. Some families have only token coverage.
Core pools, routers, factories, registries and tokens are prioritized. Testnets,
EOAs, admin wallets and implementation addresses are excluded. Only mainnets
already supported by the shared network registry are included. Do not copy a
deterministic address to another chain without a source for that deployment.

## Evidence and maintenance

Each contract references a source ID. Source records contain an official
documentation/feed URL or a pinned GitHub artifact and the date it was reviewed.
The Uniswap deployment feed also records its upstream revision and publication
date. The Uniswap token list is used only for explicitly selected Ethereum tokens,
not imported wholesale. Descriptions summarize the contract role; labels are not
taken blindly from an explorer's Solidity name.

These are checks against published deployment records, not live RPC bytecode,
proxy implementation, security, or current market availability checks. Older
versions remain useful for historical address searches. A review date does not
assert that every listed market is active or safe to transact with.

To extend the collection:

1. Find the protocol's official deployment docs or maintained address registry.
2. Confirm the version, chain ID, deployment role and user-facing proxy address.
3. Add/reuse a source record, pin GitHub evidence to a commit where possible, and
   set `reviewedAt` to the actual review date.
4. Add a checksummed address, protocol/version, specific label, role (`kind`) and
   short factual description. Use an empty version for unversioned identities.
5. Keep one entry per chain ID and address; use `aliases` for alternate names.
6. Run `node --import tsx --test lib/contractSeo.test.ts lib/seo.test.ts lib/explorerRoutes.test.ts`
   after `nvm use`, and run `pnpm exec tsc --noEmit`.

## SEO behavior

Curated deployments receive specific server-generated titles/descriptions and
canonical address casing, without external ABI requests during metadata generation.
Unknown deployments retain the existing ABI-name fallback and remain indexable.
`lib/crawlerDiscovery.ts` includes curated URLs only in the explorer hostname's
sitemap. Sitemaps do not enumerate arbitrary user-entered addresses.

There is no sitemap `lastmod` based on review dates or build time. Indexing and
ranking are not guaranteed; Search Console submission and rendered-page inspection
remain deployment follow-up work.
