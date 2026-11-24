# Swiss-Knife.xyz → ETH.sh redirects

Status: implementation prepared on `swiss-knife-legacy`; **disabled by default**.
Nothing in this branch changes live Vercel assignments or enables redirects.
The preserved pre-migration commit is `703ac93b7ef6b144f56b44b2cb18f053eab432cc`.

## Routing

`middleware.ts` calls the pure resolver in `lib/migration/redirect.js` before
legacy tool rewrites. Only `GET` and `HEAD` requests on exact legacy hosts are
eligible. Matching public pages return permanent `308` responses directly to the
final ETH.sh page, with `migration=swiss-knife` appended to trigger its banner.

The map covers every public page in the preserved app, on both apex path URLs
and tool subdomains. Unit tests derive the route inventory from `app/**/page.tsx`.
Category roots go directly to the final tool page rather than an intermediate alias.

| Old URL                                                 | Destination                                   |
| ------------------------------------------------------- | --------------------------------------------- |
| `swiss-knife.xyz/` or `www.swiss-knife.xyz/`            | `https://eth.sh/`                             |
| `calldata.swiss-knife.xyz/`                             | `https://calldata.eth.sh/decoder`             |
| `transact.swiss-knife.xyz/` or `/send-tx`               | `https://tx.eth.sh/`                          |
| `explorer.swiss-knife.xyz/`                             | `https://eth.sh/explorers`                    |
| `explorer.swiss-knife.xyz/address/<hex-address>`        | `https://explorer.eth.sh/<chainId>/<address>` |
| `explorer.swiss-knife.xyz/contract/<address>/<chainId>` | `https://explorer.eth.sh/<chainId>/<address>` |
| `explorer.swiss-knife.xyz/tx/<hash>`                    | `https://eth.sh/explorers/tx/<hash>`          |
| `explorer.swiss-knife.xyz/address/<ENS-name>`           | `https://eth.sh/explorers/address/<ENS-name>` |

For address URLs, use one supported explicit `chainId`, or Ethereum mainnet (`1`)
when absent. Explicit unsupported, empty, invalid, or ambiguous chain parameters
stay in the explorer directory rather than silently selecting mainnet. Unsupported
contract-path chains use the directory too, translating the authoritative path
chain ID into its query filter. ENS names use the directory because the unified
contract workspace currently validates hex addresses.

Other known paths retain their path on the same-named ETH.sh subdomain. Apex
paths, e.g. `swiss-knife.xyz/wallet/signatures`, use the same mapping. The exact
route list and default entries live in the resolver.

### Parameters and fragments

- Preserve unrelated query bytes, ordering, repeated keys, empty values, encoded
  nested URLs, JSON, base64, and large numeric strings. Do not parse numeric inputs
  into JavaScript numbers while building redirects.
- Replace existing `migration` fields with one `migration=swiss-knife` marker.
- The unsupported contract-chain fallback changes only `chainId`; other values
  retain their original encoding.
- HTTP requests do not send URL fragments. Locations deliberately contain no
  fragment, so browsers inherit the old fragment. Real-browser checks cover old
  signatures and 7702Beat tabs. Do not add `#` to these redirect destinations.
- The migration banner's dismissal on ETH.sh preserves other query values and
  fragments. The banner implementation is separate, in the v2 application.

### Explicit exclusions

APIs, POST bodies, storage frames, robots/sitemaps, images, worker/build assets,
unknown tool paths and unknown subdomains fall through to the legacy application.
No blanket homepage redirect is applied. Existing `/discord`, `/github`,
`/extension`, and `/gitcoin` shortcut behavior remains in the old app.
The diagnostic `/7702beat/test` and old placeholder `/explorer/[slug]` are excluded.
Their existing responses are preserved; this work does not repair pre-existing
legacy error or placeholder pages.

## Network allowlist

`lib/migration/supported-chain-ids.json` is a routing-only support snapshot from
v2's owning `data/networks.ts` registry at `b983569`. It contains IDs, not separate
network definitions, RPC URLs, credentials, or wallet-switching behavior.
Regenerate from the v2 checkout before cutover if that registry changes:

```bash
nvm use
pnpm exec tsx -e 'import { chainIdToChain } from "./data/networks"; process.stdout.write(JSON.stringify(Object.keys(chainIdToChain).map(Number).sort((a,b)=>a-b),null,2)+"\n")' > /tmp/eth-migration-chain-ids.json
```

Then copy that JSON into this branch's support snapshot and rerun migration tests.
This allowlist is deliberately conservative; saved custom-chain data from old
origins is not available to server middleware.

## Local verification

Use Node from `.nvmrc` (22), then `pnpm install --frozen-lockfile`. Next.js 14
requires the `jsx: preserve` setting normalized by its own development server.
Use `.example.env.local` as the template for an ignored `.env.local` when testing
legacy HTML; its sample WalletConnect project ID is needed by the existing app.

```bash
nvm use
pnpm test:migration
pnpm exec tsc --noEmit

# Terminal 1: migration enabled only in this local process
SWISS_KNIFE_MIGRATION_ENABLED=true pnpm dev --port 3222

# Terminal 2: actual HTTP middleware checks
SWISS_KNIFE_MIGRATION_ENABLED=true MIGRATION_TEST_ORIGIN=http://127.0.0.1:3222 pnpm test:migration:http
MIGRATION_TEST_ORIGIN=http://127.0.0.1:3222 pnpm test:migration:browser
```

The browser test starts an isolated Chrome profile, maps legacy hosts to the
local Next server, and intercepts new-domain HTML with a static fixture. It makes
no live ETH.sh requests. Set `MIGRATION_CHROME_BINARY` if Chrome is elsewhere.
It verifies the real browser's final URL, query and fragment after the 308;
ETH.sh tool hydration/banner behavior needs its own destination checks.

Restart Terminal 1 with the flag `false`, then run:

```bash
SWISS_KNIFE_MIGRATION_ENABLED=false MIGRATION_TEST_ORIGIN=http://127.0.0.1:3222 pnpm test:migration:http
```

Without `MIGRATION_TEST_ORIGIN`, HTTP tests skip rather than contacting production.

Verified locally on 2026-11-24:

- 59 route/parameter tests passed.
- 15 enabled HTTP checks passed on both development and built production servers.
- 3 disabled HTTP checks passed, including the legacy homepage returning 200.
- 6 real-browser fragment/query checks passed on development and production.
- TypeScript and production builds with the migration flag false and true passed.
  The legacy app still emits its existing Next config and React hook warnings.

## Cutover gate — not performed

1. Inspect Vercel's project/repository/branch and domain assignments, including
   every legacy and ETH.sh tool host, and record rollback deployment IDs.
2. Deploy the latest v2 code, including the migration banner, to every ETH.sh
   destination and smoke-test representative real share links.
3. Decide how old-origin address books, favorites and other saved settings can
   be recovered before redirecting their normal pages. This code does not transfer
   local storage, credentials or wallet sessions.
4. Ensure legacy domains are assigned to a deployment of `swiss-knife-legacy`
   before merging v2 into master. Keep the legacy flag false during this move.
5. Validate the merged ETH.sh deployment and direct route map. Then explicitly
   authorize activation, set `SWISS_KNIFE_MIGRATION_ENABLED=true` on the legacy
   Vercel project and redeploy. Treat the flag as deployment configuration;
   changing a dashboard variable alone does not update existing deployments.
6. Verify 308 destinations, banner visibility, query and fragment hydration,
   robots/canonical/sitemap behavior, errors and API consumers after cutover.
   Complete applicable Search Console domain-move steps separately.

Rollback: set the legacy flag to false and redeploy, or restore the recorded
pre-activation deployment. Retain old domains and TLS for the redirects long term.

### Deployment evidence captured during preparation (2026-11-24)

GitHub's latest deployment record for `apoorvlathey/swiss-knife-vercel` showed a
successful `eth-sh-v2` deployment from `8b4b68884a82eef20c0eb35c0b78c1f550d98716`.
No deployment records were returned for `swiss-knife-xyz/swiss-knife` in the same
check. This is evidence about recorded deployments, not proof of current Vercel
domain assignments. The newer banner commit `b983569` on origin/v2 must be verified
on the actual ETH.sh deployment before activation. No production settings changed.
