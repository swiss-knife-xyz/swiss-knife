import {
  getFaucetChainSeoName,
  getFaucetChainSlug,
  getFaucetsForChain,
} from "./chains";

const getTokenSymbols = (token: string) =>
  Array.from(
    new Set(
      token
        .toUpperCase()
        .split(/[^A-Z0-9]+/)
        .filter(Boolean)
        .filter((symbol) => symbol !== "OR")
    )
  );

const getFaucetTokenSymbols = (chain: string) =>
  Array.from(
    new Set(
      getFaucetsForChain(chain).flatMap((faucet) =>
        faucet.variants?.length
          ? faucet.variants
              .filter((variant) => variant.chain === chain)
              .map((variant) => variant.token)
          : getTokenSymbols(faucet.token)
      )
    )
  );

export const FAUCET_BASE_URL = "https://faucet.eth.sh";
export const FAUCET_OG_IMAGE = "https://eth.sh/api/og/faucet";

const getFaucetOgImage = (chain?: string) =>
  chain
    ? `${FAUCET_OG_IMAGE}?chain=${encodeURIComponent(getFaucetChainSlug(chain))}`
    : FAUCET_OG_IMAGE;

export const buildFaucetSeo = (chain?: string) => {
  if (!chain) {
    return {
      title: "Testnet Faucets | ETH.sh",
      description:
        "Find working Ethereum, Base, Optimism, Arbitrum, Polygon, Unichain, Avalanche, BNB, ZKsync, Monad, and stablecoin testnet faucets.",
      canonicalUrl: `${FAUCET_BASE_URL}/`,
      image: getFaucetOgImage(),
      keywords: [
        "testnet faucet",
        "ethereum faucet",
        "sepolia faucet",
        "base sepolia faucet",
        "crypto testnet faucet",
      ],
    };
  }

  const chainName = getFaucetChainSeoName(chain);
  const tokens = getFaucetTokenSymbols(chain);
  const tokenCopy =
    tokens.length > 0
      ? `${tokens.slice(0, 4).join(", ")}${tokens.length > 4 ? ", and more" : ""}`
      : "testnet";
  const slug = getFaucetChainSlug(chain);

  return {
    title: `${chainName} Faucets | ETH.sh`,
    description: `Find working ${chainName} faucets for ${tokenCopy} testnet tokens. Claim tokens from faucets and track your cooldowns per network and token.`,
    canonicalUrl: `${FAUCET_BASE_URL}/${slug}`,
    image: getFaucetOgImage(chain),
    keywords: [
      `${chainName} faucet`,
      `${chainName} testnet faucet`,
      `${chainName} tokens`,
      `${chainName} ${tokens[0] ?? "testnet"} faucet`,
      "testnet faucet",
    ],
  };
};
