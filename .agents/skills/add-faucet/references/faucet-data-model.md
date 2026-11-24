# Faucet Data Model

## Core Files

- `app/faucet/faucets.ts`: faucet data, categories, reliability types.
- `app/faucet/chains.ts`: canonical chain names, chain slug overrides, chain slug aliases.
- `app/faucet/FaucetPageClient.tsx`: sorting, filtering, UI chain icons, token icons.
- `app/api/og/faucet/route.tsx`: OG image chain and token icons.
- `public/chainIcons/*`, `public/tokenIcons/*`: local visual assets.

## Entry Fields

Each `FaucetEntry` needs:

- `id`: stable lowercase slug, usually `{provider}-{chain}`. Avoid changing IDs for existing entries because ratings and local cooldown records key off IDs.
- `name`: faucet display name from provider/source when available.
- `provider`: provider display name, consistent with existing entries.
- `url`: direct faucet URL. Unique chain-specific URLs should be represented as separate entries.
- `faviconDomain`: optional override only when the URL favicon is poor or the provider logo should come from a different domain.
- `chain`: canonical chain label when the entry is single-chain.
- `supportedChains`: use when one URL supports several chains without per-chain token/amount details.
- `variants`: use when one URL supports multiple chain/token/amount combinations.
- `token`: display token string. Use `ETH + LINK`, `USDC, EURC`, etc. for multi-token entries.
- `amount`: concise source-backed amount and cadence, e.g. `Up to 0.5 ETH every 24h`, `One drip every 12h`, `Varies`.
- `cooldownHours`: numeric local cooldown default. Use source cadence when available.
- `category`: one of `aggregator`, `ethereum`, `l2`, `appchain`, `stablecoin`.
- `reliability`: one of `official`, `provider`, `community`.
- `requirement`: concise eligibility text. Include account/API/social/mainnet balance requirements when sourced.
- `notes`: neutral one-sentence context.
- `tags`: lowercase search tags for provider, chain, token, and common aliases.

## Chain Labels And Slugs

- Reuse canonical labels already in `faucets.ts` when possible.
- Common examples: `Ethereum Sepolia`, `Ethereum Hoodi`, `Base Sepolia`, `OP Sepolia`, `Arbitrum Sepolia`, `Polygon Amoy`, `ZKsync Sepolia`, `Scroll Sepolia`, `BNB Smart Chain Testnet`, `Monad Testnet`, `HyperEVM Testnet`, `Plasma Testnet`.
- Add `chainSlugAliases` for common external names that users will type, such as provider route names ending in `-testnet`.
- Prefer aliases over duplicate chain labels.

## Icons

Update both UI and OG maps when adding icon support:

- `app/faucet/FaucetPageClient.tsx`
  - `preferredTokenOrder` for newly introduced token symbols.
  - `chainIconMap` for new chain labels.
  - `tokenLogoSources` for new token icons.
- `app/api/og/faucet/route.tsx`
  - `chainIconMap`
  - `tokenLogoSources`

Icon asset rules:

- Prefer official brand pages, official docs, or official GitHub repos.
- Verify downloaded assets with `curl -fsSI`, `file`, and a quick content check.
- Use SVG when available and compatible; otherwise use PNG/WebP matching existing conventions.
- If no trustworthy asset exists, let the UI text fallback render and mention the limitation.

## Validation Commands

```bash
pnpm exec prettier --write app/faucet/faucets.ts app/faucet/chains.ts app/faucet/FaucetPageClient.tsx app/api/og/faucet/route.tsx
pnpm exec tsx .agents/skills/add-faucet/scripts/audit_faucets.ts
pnpm exec tsc --noEmit
```

Useful audit examples:

```bash
pnpm exec tsx .agents/skills/add-faucet/scripts/audit_faucets.ts --provider Chainstack
pnpm exec tsx .agents/skills/add-faucet/scripts/audit_faucets.ts --url https://faucet.example.com/testnet
pnpm exec tsx .agents/skills/add-faucet/scripts/audit_faucets.ts --slug plasma-testnet
```
