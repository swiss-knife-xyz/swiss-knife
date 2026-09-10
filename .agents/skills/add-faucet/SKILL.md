---
name: add-faucet
description: Research and add or update faucet entries in swiss-knife's /faucet directory. Use when the user provides faucet URLs, provider faucet pages, chain/testnet names, asks to add missing faucet sources, add provider-specific faucet links, update faucet metadata, add chain aliases, or fix faucet chain/token icons.
---

# Add Faucet

## Overview

Add faucet links to the swiss-knife faucet directory with source-backed metadata, duplicate checks, route support, and matching chain/token icons. Keep changes scoped to faucet data and supporting faucet surfaces unless the user explicitly asks for UI redesign.

## Read First

Read the current implementation before editing:

- `app/faucet/faucets.ts`
- `app/faucet/chains.ts`
- `app/faucet/FaucetPageClient.tsx`
- `app/api/og/faucet/route.tsx`
- `references/faucet-data-model.md` for field conventions and validation commands

Use the audit helper while inspecting and validating:

```bash
pnpm exec tsx .agents/skills/add-faucet/scripts/audit_faucets.ts
```

## Workflow

1. Check existing coverage before editing:
   - Search exact URLs, provider names, chain names, and likely IDs with `rg`.
   - Run the audit helper with `--provider`, `--url`, or `--slug` when relevant.
   - If the exact faucet URL already exists, skip it unless metadata is stale or the user asked for an update.

2. Research every external faucet addition or metadata update:
   - Browse official faucet pages, provider docs, official brand pages, or official GitHub/docs first.
   - Capture chain name, token symbol, amount, cooldown, eligibility requirements, and whether the URL is chain-specific or multi-chain.
   - Prefer exact source values. Use `Varies` only when the source does not publish a stable amount.
   - For X/Twitter status links, use the `read-twitter-posts` skill.

3. Choose the entry shape:
   - Use separate `FaucetEntry` objects when each chain has a unique provider URL.
   - Use `supportedChains` when one URL serves many chains with the same top-level token/amount semantics.
   - Use `variants` when one URL serves many chain/token/amount combinations.
   - Follow existing chain labels and provider naming. Add aliases instead of renaming established chains unless the user asks.

4. Edit narrowly:
   - Add or update entries in `app/faucet/faucets.ts` near related provider or chain entries.
   - Update `app/faucet/chains.ts` when a common route slug should resolve to the canonical chain label.
   - Update both `FaucetPageClient.tsx` and `app/api/og/faucet/route.tsx` when adding chain or token icons.
   - Add official icon assets under `public/chainIcons` or `public/tokenIcons` only when a local asset is needed and sourceable.

5. Validate:
   - `pnpm exec prettier --write` on touched TS/TSX/MD files.
   - `pnpm exec tsx .agents/skills/add-faucet/scripts/audit_faucets.ts`
   - `pnpm exec tsc --noEmit`
   - If a dev server is running, `curl -fsSI` the changed faucet routes and any new public icon assets.
   - If icon rendering, long labels, or row layout changed, inspect the page visually.

6. Commit only when the user asks.

## Reporting

Mention skipped duplicates, newly added faucet IDs, source assumptions, and verification commands. If a value is inferred from a source rather than explicitly stated, say so.
