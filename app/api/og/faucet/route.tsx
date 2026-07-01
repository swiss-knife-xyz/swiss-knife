import { ImageResponse } from "next/og";
import {
  getFaucetChainBySlug,
  getFaucetChainNames,
  getFaucetChainSeoName,
  getFaucetChainSlug,
  getFaucetsForChain,
  getFaucetChains,
} from "@/app/faucet/chains";
import { faucets, type FaucetEntry } from "@/app/faucet/faucets";

export const runtime = "edge";

export const alt = "ETH.sh faucet directory";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const chainIconMap: Array<[string, string]> = [
  ["ApeChain", "/chainIcons/apechain.webp"],
  ["Citrea", "/chainIcons/citrea.svg"],
  ["Arbitrum", "/chainIcons/arbitrum.svg"],
  ["Avalanche", "/chainIcons/avalanche.svg"],
  ["Base", "/chainIcons/base.svg"],
  ["BNB", "/chainIcons/bsc.svg"],
  ["BSC", "/chainIcons/bsc.svg"],
  ["Celo", "/chainIcons/celo.webp"],
  ["Ethereum", "/chainIcons/ethereum.svg"],
  ["Filecoin", "/chainIcons/filecoin.webp"],
  ["Flow", "/chainIcons/flow.webp"],
  ["Gnosis", "/chainIcons/gnosis.webp"],
  ["HyperEVM", "/chainIcons/hyperevm.svg"],
  ["Ink", "/chainIcons/ink.svg"],
  ["Linea", "/chainIcons/linea.svg"],
  ["MegaETH", "/chainIcons/megaeth.svg"],
  ["Monad", "/chainIcons/monad.svg"],
  ["OP ", "/chainIcons/optimism.svg"],
  ["Optimism", "/chainIcons/optimism.svg"],
  ["Polygon", "/chainIcons/polygon.svg"],
  ["RISE", "/chainIcons/rise.svg"],
  ["Robinhood", "/chainIcons/robinhood.svg"],
  ["Scroll", "/chainIcons/scroll.webp"],
  ["Sei", "/chainIcons/sei.svg"],
  ["Stable", "/chainIcons/stable.svg"],
  ["Story", "/chainIcons/story.webp"],
  ["Unichain", "/chainIcons/unichain.svg"],
  ["World", "/chainIcons/worldchain.svg"],
  ["Zircuit", "/chainIcons/zircuit.svg"],
  ["ZKsync", "/chainIcons/zksync.webp"],
];

const tokenLogoSources: Record<string, string> = {
  AVAX: "/tokenIcons/avax.png",
  BNB: "/tokenIcons/bnb.png",
  BTC: "/tokenIcons/btc.png",
  CBTC: "/tokenIcons/btc.png",
  CBBTC: "/tokenIcons/cbbtc.webp",
  CELO: "/chainIcons/celo.webp",
  CIRBTC: "/tokenIcons/btc.png",
  ETH: "/tokenIcons/eth.png",
  EURC: "/tokenIcons/eurc.png",
  FIL: "/chainIcons/filecoin.webp",
  FLOW: "/chainIcons/flow.webp",
  HYPE: "/chainIcons/hyperevm.svg",
  IP: "/chainIcons/story.webp",
  LINK: "/tokenIcons/link.png",
  MON: "/tokenIcons/mon.svg",
  MATIC: "/tokenIcons/pol.png",
  POL: "/tokenIcons/pol.png",
  USDC: "/tokenIcons/usdc.png",
  APE: "/chainIcons/apechain.webp",
  XDAI: "/chainIcons/gnosis.webp",
};

const frictionRanks: Record<string, number> = {
  "Google Cloud": 30,
  ETHGlobal: 35,
  GetBlock: 50,
  Tatum: 50,
  "Coinbase Developer Platform": 50,
  thirdweb: 50,
  Chainlink: 80,
  Chainstack: 85,
  "SepoliaETH.com": 1000,
};

const getPublicAssetUrl = (path: string, request: Request) =>
  new URL(path, request.url).toString();

const getChainIconPath = (chain: string) => {
  const match = chainIconMap.find(([name]) => chain.includes(name));
  return match ? match[1] : "/logo.png";
};

const getChainIconUrl = (chain: string, request: Request) =>
  getPublicAssetUrl(getChainIconPath(chain), request);

const getTokenIconUrl = (token: string, request: Request, chain?: string) => {
  const symbol = token.toUpperCase();
  const tokenPath = tokenLogoSources[symbol];

  if (tokenPath) return getPublicAssetUrl(tokenPath, request);
  if (chain) return getChainIconUrl(chain, request);
  return getPublicAssetUrl("/logo.png", request);
};

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

const getFaucetTokens = (faucet: FaucetEntry, chain?: string) =>
  faucet.variants?.length
    ? faucet.variants
        .filter((variant) => !chain || variant.chain === chain)
        .map((variant) => variant.token)
    : getTokenSymbols(faucet.token);

const getFaucetFrictionRank = (faucet: FaucetEntry) => {
  const providerRank = frictionRanks[faucet.provider];
  if (providerRank !== undefined) return providerRank;

  const requirement = faucet.requirement.toLowerCase();

  if (requirement.includes("no account")) return 10;
  if (requirement.includes("payment") || requirement.includes("buy")) {
    return 1000;
  }
  if (requirement.includes("api key")) return 85;
  if (
    requirement.includes("mainnet") ||
    requirement.includes("balance") ||
    requirement.includes("1 link")
  ) {
    return 75;
  }
  if (
    requirement.includes("account") ||
    requirement.includes("login") ||
    requirement.includes("email")
  ) {
    return 50;
  }
  if (
    requirement.includes("proof-of-work") ||
    requirement.includes("captcha")
  ) {
    return 25;
  }
  if (
    requirement.includes("wallet connect") ||
    requirement.includes("wallet address")
  ) {
    return 20;
  }
  return 30;
};

const getFeaturedFaucets = (chain?: string) =>
  (chain ? getFaucetsForChain(chain) : faucets)
    .toSorted(
      (first, second) =>
        getFaucetFrictionRank(first) - getFaucetFrictionRank(second) ||
        first.provider.localeCompare(second.provider) ||
        first.name.localeCompare(second.name)
    )
    .slice(0, 5);

const resolveChain = (request: Request) => {
  const { searchParams } = new URL(request.url);
  const rawChain = searchParams.get("chain");
  if (!rawChain) return undefined;

  return getFaucetChainBySlug(rawChain) ?? undefined;
};

const safeCount = (value: number) => value.toLocaleString("en-US");

export async function GET(request: Request) {
  try {
    const chain = resolveChain(request);
    const chainName = chain ? getFaucetChainSeoName(chain) : undefined;
    const title = chainName ? `${chainName} Faucets` : "Testnet Faucets";
    const subtitle = chainName
      ? "Working faucet links with local claim cooldowns."
      : "Claim tokens from faucets and track cooldowns per network.";
    const scopedFaucets = chain ? getFaucetsForChain(chain) : faucets;
    const chains = chain ? [chain] : getFaucetChainNames();
    const tokens = Array.from(
      new Set(scopedFaucets.flatMap((faucet) => getFaucetTokens(faucet, chain)))
    ).slice(0, 8);
    const featuredFaucets = getFeaturedFaucets(chain);
    const visibleChains = chains.slice(0, 8);
    const routeLabel = chain
      ? `faucet.eth.sh/${getFaucetChainSlug(chain)}`
      : "faucet.eth.sh";

    const [fontData] = await Promise.all([
      fetch(
        new URL("../../../../assets/Poppins-Bold.ttf", import.meta.url)
      ).then((response) => response.arrayBuffer()),
    ]);
    const logoUrl = getPublicAssetUrl("/logo.png", request);
    const chainIconUrls = visibleChains.map((chainName) =>
      getChainIconUrl(chainName, request)
    );
    const tokenIconUrls = tokens.map((token) =>
      getTokenIconUrl(token, request, chain)
    );
    const featuredChainIconUrls = featuredFaucets.map((faucet) =>
      getChainIconUrl(chain ?? getFaucetChains(faucet)[0], request)
    );

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: "#080809",
            color: "#F6F6F7",
            fontFamily: "Poppins",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              opacity: 0.26,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              background:
                "linear-gradient(135deg, rgba(232,65,66,0.24), transparent 36%), linear-gradient(315deg, rgba(87,194,255,0.16), transparent 34%)",
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              padding: "56px 62px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <img
                  src={logoUrl}
                  width={46}
                  height={46}
                  alt=""
                  style={{ borderRadius: 10 }}
                />
                <div
                  style={{
                    display: "flex",
                    fontSize: 28,
                    letterSpacing: "-0.02em",
                  }}
                >
                  ETH.sh
                </div>
              </div>
              {chainName && (
                <div
                  style={{
                    display: "flex",
                    color: "#A1A1AA",
                    fontSize: 24,
                  }}
                >
                  {routeLabel}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "62%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    color: "#E84142",
                    fontSize: 25,
                    marginBottom: 22,
                  }}
                >
                  Faucet directory
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: chainName ? 78 : 86,
                    lineHeight: 0.98,
                    letterSpacing: "-0.045em",
                    maxWidth: 670,
                  }}
                >
                  {title}
                </div>
                <div
                  style={{
                    display: "flex",
                    color: "#B9B9C0",
                    fontSize: 30,
                    lineHeight: 1.35,
                    marginTop: 28,
                    maxWidth: 660,
                  }}
                >
                  {subtitle}
                </div>

                <div style={{ display: "flex", gap: 18, marginTop: 42 }}>
                  {[
                    ["Faucets", safeCount(scopedFaucets.length)],
                    ["Networks", safeCount(chains.length)],
                    ["Tokens", safeCount(tokens.length)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        minWidth: 128,
                        padding: "14px 18px",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 16,
                        background: "rgba(255,255,255,0.045)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          color: "#8D8D96",
                          fontSize: 18,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          fontSize: 32,
                          marginTop: 4,
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  width: "38%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  alignItems: "stretch",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    justifyContent: "flex-end",
                  }}
                >
                  {visibleChains.map((chainName, index) => (
                    <div
                      key={chainName}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        height: 38,
                        padding: "0 13px 0 7px",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 999,
                        background: "rgba(12,12,14,0.72)",
                      }}
                    >
                      <img
                        src={chainIconUrls[index]}
                        width={25}
                        height={25}
                        alt=""
                        style={{ borderRadius: 999 }}
                      />
                      <span style={{ fontSize: 17, color: "#F4F4F5" }}>
                        {chainName
                          .replace("Ethereum Sepolia", "Sepolia")
                          .replace("OP Sepolia", "Optimism")
                          .replace(" Testnet", "")
                          .replace(" Sepolia", "")}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    marginTop: 10,
                  }}
                >
                  {featuredFaucets.map((faucet, index) => (
                    <div
                      key={faucet.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        height: 56,
                        padding: "0 16px",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 14,
                        background: "rgba(17,17,19,0.78)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 11,
                          minWidth: 0,
                        }}
                      >
                        <img
                          src={featuredChainIconUrls[index]}
                          width={26}
                          height={26}
                          alt=""
                          style={{ borderRadius: 999 }}
                        />
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            minWidth: 0,
                          }}
                        >
                          <span style={{ fontSize: 19, color: "#F5F5F5" }}>
                            {faucet.provider}
                          </span>
                          <span style={{ fontSize: 13, color: "#8F8F99" }}>
                            {faucet.cooldownHours}h cooldown
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: 15, color: "#A1A1AA" }}>
                        {getFaucetTokens(faucet, chain).slice(0, 2).join(" + ")}
                      </span>
                    </div>
                  ))}
                </div>

                {tokens.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 9,
                      marginTop: 4,
                    }}
                  >
                    {tokens.slice(0, 6).map((token, index) => (
                      <div
                        key={token}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          height: 32,
                          padding: "0 10px 0 5px",
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                      >
                        <img
                          src={tokenIconUrls[index]}
                          width={22}
                          height={22}
                          alt=""
                          style={{ borderRadius: 999 }}
                        />
                        <span style={{ fontSize: 14, color: "#D8D8DD" }}>
                          {token === "CIRBTC" ? "cirBTC" : token}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        ...size,
        fonts: [
          {
            name: "Poppins",
            data: fontData,
            style: "normal",
          },
        ],
      }
    );
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
}
