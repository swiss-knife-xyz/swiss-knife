# Repository Notes

- Use the Node version in `.nvmrc` (`nvm use`) before running development or build commands. Next.js 16 requires Node >=20.9; the verified local runtime is Node 22 LTS.
- For every new page or tool created under `app/`, add page-specific metadata in the nearest `layout.tsx` using `getMetadata` or a typed Next.js `Metadata` export.
- New public pages/tools must include a page-specific Open Graph image served by a Next.js OG API route under `app/api/og/<slug>/route.tsx`. Wire that route into the layout metadata `images` field for both Open Graph and Twitter cards.
- Do not ship new pages with the generic `https://eth.sh/og/index.png` image unless the page is intentionally generic or temporary.

## Networks and RPC access

- Read [_docs/networks.md](_docs/networks.md) before adding or changing network support, network selectors, or RPC access.
- Keep network definitions, names, icons, aliases, and RPC endpoint configuration in `data/networks.ts`. `data/common.ts` is a compatibility re-export; do not add parallel network definitions or hardcoded RPC URLs in tools.
- Use `NetworkSelect` for standard network dropdowns and the shared identity/option helpers for specialized pickers. Keep each tool's selected network independent; do not introduce shared selection state or switch the wallet implicitly.
- Keep protocol/provider support lists explicit and reference network IDs. Adding a network to the registry does not establish support in every tool. Preserve provider-only networks and directory-only metadata where applicable.
- Use `getPublicClient(chainId)` for viem reads, `getRpcTransport(chainId)` for wagmi, and `getEthersProvider(chainId)` when ethers is required. RPC Console must use the public-only endpoint policy. Explicit user-entered RPC testing and server-only credentials are documented exceptions.
- After changing shared network behavior, run `pnpm test:networks`, the affected tool suites, and `pnpm exec tsc --noEmit`.

- User-saved chains use `lib/customChains/` and the shared `/_storage` iframe hub, in a separate namespace from the address book. Preserve explicit existing-ID override confirmation, no public fallback for custom RPCs, and waiting for saved settings before browser RPC reads. Never proxy user-entered RPC URLs through server routes. See the user-saved chains section in `_docs/networks.md`.
