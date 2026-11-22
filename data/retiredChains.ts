// Reviewed 2026-11-22. Excluded from active tools, wallets, faucets and verifier
// routes. Keep the reasons and sources here so dependency/catalog refreshes do
// not silently bring retired chains back. Historical R.I.P. records are separate.
// Canto is an availability exclusion, not a claim of an announced shutdown.
type Retirement = {
  name: string;
  reason: string;
  source: string;
  replacementChainId?: number;
};
const goerliSource = "https://blog.ethereum.org/2023/11/30/goerli-lts-update";
const taikoSource =
  "https://paragraph.com/@taiko-labs/taikolights-q3-2025-community-update";
const polygonSource = "https://polygon.technology/polygon-zkevm";
const moonbeamSource =
  "https://moonbeam.network/news/moonbeam-strategic-update-moonbeam-network-relaunches-on-base";
const kromaSource =
  "https://medium.com/@kroma-network/important-announcement-kroma-shutdown-user-funds-withdrawal-e6e00df87706";
export const RETIRED_CHAINS: Readonly<Record<number, Retirement>> = {
  7700: {
    name: "Canto",
    reason:
      "Unavailable/stalled at the 2026-11-22 audit: documented public RPCs failed and the validator endpoint served a 2026-08-10 head. No official shutdown confirmed; restore only after checking a live head.",
    source: "https://dteam.tech/services/endpoints/canto/mainnet",
  },
  4002: {
    name: "Fantom Testnet",
    reason:
      "Legacy testnet deprecated in Chainlink's chain registry; public endpoint unavailable. This does not retire Opera mainnet.",
    source:
      "https://github.com/smartcontractkit/chain-selectors/blob/main/selectors.yml",
  },
  // These additional provider-registry routes are also obsolete even though
  // they were not in the narrower contract/deployment catalog.
  1135: {
    name: "Lisk",
    reason: "Chain shutdown confirmed 2026-11-02.",
    source: "https://lisk.com/blog/posts/introducing-the-new-lisk/",
  },
  1923: {
    name: "Swellchain",
    reason: "Permanent shutdown announced after June 2026 withdrawal deadline.",
    source:
      "https://www.swellnetwork.io/post/sunsetting-swellchain-from-l2-to-faro",
  },
  1625: {
    name: "Gravity Alpha L2",
    reason:
      "Deprecated L2; asset exit deadline 2026-11-01, settlement retirement December 2026.",
    source:
      "https://docs.gravity.xyz/legacy-alpha-mainnet-l2/token-contracts-on-gravity",
    replacementChainId: 127001,
  },
  // Goerli and its L2 deployments were replaced by Sepolia networks in 2024.
  5: {
    name: "Goerli",
    reason: "Goerli support ended in 2024.",
    source: goerliSource,
    replacementChainId: 11155111,
  },
  420: {
    name: "OP Goerli",
    reason: "Goerli-based testnet retired.",
    source: goerliSource,
    replacementChainId: 11155420,
  },
  421613: {
    name: "Arbitrum Goerli",
    reason: "Goerli-based testnet retired.",
    source: goerliSource,
    replacementChainId: 421614,
  },
  84531: {
    name: "Base Goerli",
    reason: "Goerli-based testnet retired.",
    source: "https://docs.base.org/base-chain/network-information",
    replacementChainId: 84532,
  },
  59140: {
    name: "Linea Goerli",
    reason: "Superseded by Linea Sepolia.",
    source: "https://docs.linea.build/changelog/release-notes",
    replacementChainId: 59141,
  },
  999: {
    name: "Zora Goerli",
    reason: "Goerli-based testnet retired.",
    source: goerliSource,
    replacementChainId: 999999999,
  },
  280: {
    name: "ZKsync Goerli",
    reason: "Goerli-based testnet retired.",
    source: goerliSource,
    replacementChainId: 300,
  },
  3441005: {
    name: "Manta Pacific Goerli",
    reason: "Superseded by Manta Pacific Sepolia.",
    source: "https://pacific-info.sepolia-testnet.manta.network/",
    replacementChainId: 3441006,
  },
  5001: {
    name: "Mantle Goerli",
    reason: "Goerli-based testnet retired.",
    source: goerliSource,
    replacementChainId: 5003,
  },
  // Holesky and dependent testnets were replaced in 2025.
  17000: {
    name: "Holesky",
    reason: "Sunset in 2025; use Hoodi for validators or Sepolia for apps.",
    source:
      "https://blog.ethereum.org/2025/09/01/holesky-shutdown-announcement",
    replacementChainId: 560048,
  },
  44787: {
    name: "Celo Alfajores",
    reason: "Support ended 2025-09-30.",
    source:
      "https://forum.celo.org/t/introducing-celo-sepolia-celo-s-new-ethereum-l2-testnet/12155",
    replacementChainId: 11142220,
  },
  2522: {
    name: "Fraxtal Holesky",
    reason: "Replaced by Hoodi chain 2523; the reused RPC now returns that ID.",
    source: "https://docs.frax.com/fraxtal/network/network-information",
    replacementChainId: 2523,
  },
  // Taiko alpha releases are not the current public testnet.
  167005: {
    name: "Taiko Alpha-3",
    reason: "Retired alpha testnet.",
    source: taikoSource,
    replacementChainId: 167013,
  },
  167007: {
    name: "Taiko Jolnir",
    reason: "Retired alpha testnet.",
    source: taikoSource,
    replacementChainId: 167013,
  },
  167008: {
    name: "Taiko Katla",
    reason: "Retired alpha testnet.",
    source: taikoSource,
    replacementChainId: 167013,
  },
  167009: {
    name: "Taiko Hekla",
    reason: "Replaced by Taiko Hoodi in 2025.",
    source: taikoSource,
    replacementChainId: 167013,
  },
  80001: {
    name: "Polygon Mumbai",
    reason: "Retired April 2024; use Amoy.",
    source:
      "https://polygon.technology/blog/polygon-pos-is-cooking-the-napoli-upgrade-means-better-ux-the-mumbai-testnet-takes-a-bow",
    replacementChainId: 80002,
  },
  1028: {
    name: "BitTorrent old testnet",
    reason: "Official testnet is Donau, chain 1029.",
    source: "https://doc.bt.io/docs/networks/network/",
    replacementChainId: 1029,
  },
  1442: {
    name: "Polygon zkEVM Goerli",
    reason: "Retired Goerli testnet; zkEVM itself has also sunset.",
    source: polygonSource,
  },
  2442: {
    name: "Polygon zkEVM Cardona",
    reason: "zkEVM mainnet and Cardona sunset July 2026.",
    source:
      "https://www.alchemy.com/docs/reference/polygon-zkevm-deprecation-notice",
  },
  // Confirmed mainnet retirements; a remaining archive RPC is not active support.
  66: {
    name: "OKTChain",
    reason: "OKX ended official operation/support on 2026-01-01.",
    source:
      "https://www.okx.com/en-us/help/announcement-on-the-pp-upgrade-of-x-layer-and-optimisation-of-the-okb-gas",
    replacementChainId: 196,
  },
  255: {
    name: "Kroma",
    reason: "Original L2 shut down in 2025.",
    source: kromaSource,
  },
  2358: {
    name: "Kroma Sepolia",
    reason: "Testnet of the retired Kroma L2.",
    source: kromaSource,
  },
  1101: {
    name: "Polygon zkEVM",
    reason: "Sequencer sunset completed 2026-07-03.",
    source: polygonSource,
  },
  534351: {
    name: "Scroll Sepolia",
    reason: "Shut down after 2026-07-30; mainnet remains active.",
    source: "https://docs.scroll.io/en/developers/",
  },
  1284: {
    name: "Moonbeam",
    reason: "Parachain wound down after July 2026 migration to Base.",
    source: moonbeamSource,
    replacementChainId: 8453,
  },
  1285: {
    name: "Moonriver",
    reason: "MOVR migrated to Base in July 2026.",
    source:
      "https://api.moonbeam.network/news/moonriver-strategic-update-movr-is-migrating-to-base",
    replacementChainId: 8453,
  },
  1287: {
    name: "Moonbase Alpha",
    reason: "Legacy Moonbeam test infrastructure retired with the parachains.",
    source: "https://docs.tatum.io/changelog/moonbeam-networks-removal",
  },
  9001: {
    name: "Evmos",
    reason:
      "Shutdown governance proposal; block production ended May 2026. Original governance page is now unavailable.",
    source: "https://polkachu.com/gov_proposals/7379",
  },
  2000: {
    name: "Dogechain",
    reason: "Network services ended 2026-08-08.",
    source: "https://x.com/DogechainFamily/status/2079579454767063405",
  },
  81457: {
    name: "Blast",
    reason: "L2 shutdown confirmed 2026-11-04.",
    source: "https://x.com/blast/status/2117993462356197406",
  },
  168587773: {
    name: "Blast Sepolia",
    reason: "Testnet of the retired Blast L2; RPC no longer available.",
    source: "https://x.com/blast/status/2117993462356197406",
  },
  1666600000: {
    name: "Harmony One",
    reason: "Stopped producing blocks 2026-09-10.",
    source: "https://www.ankr.com/docs/changelog/harmony-end-of-support/",
  },
};
export const isRetiredChain = (id: number | string) =>
  Object.hasOwn(RETIRED_CHAINS, String(id));
