export type PrivacyStatus = "Mainnet" | "Public testnet";

export type PrivacyProtocolSource = {
  label: string;
  href: string;
};

export type PrivacyProtocolEntry = {
  id: string;
  parentId?: string;
  name: string;
  version?: string;
  provider: string;
  status: PrivacyStatus;
  url: string;
  logoDomain: string;
  logoBg?: string;
  accent: string;
  bestFor: string;
  networks: string[];
  assets: string[];
  amountModel: string;
  depositFee: string;
  withdrawalFee: string;
  transferFee: string;
  waitTime: string;
  transferModel: string;
  privacyModel: string;
  cryptography: string;
  compliance: string;
  custody: string;
  userCaveat: string;
  sources: PrivacyProtocolSource[];
};

export type PrivacyProtocolGroup = {
  id: string;
  name: string;
  description: string;
  entries: PrivacyProtocolEntry[];
};

export const externalDashboardLinks = [
  {
    url: "https://private-transfers.pse.dev/",
    fallbackTitle: "Private Transfers Analysis",
    fallbackDescription:
      "PSE dashboard for comparing private transfer systems, fees, constraints, and implementation tradeoffs.",
  },
  {
    url: "https://l2beat.com/privacy/summary",
  },
  {
    url: "https://shhheth.com/",
  },
] as const;

export const privacyProtocols: PrivacyProtocolEntry[] = [
  {
    id: "tornado-cash",
    name: "Tornado Cash",
    provider: "Tornado Cash DAO / immutable contracts",
    status: "Mainnet",
    url: "https://tornadocash.eth.limo/",
    logoDomain: "tornadocash.eth.limo",
    logoBg: "#10231d",
    accent: "#8A9CFF",
    bestFor:
      "Simple deposit-wait-withdraw privacy where fixed-size pools are acceptable.",
    networks: [
      "Ethereum",
      "Arbitrum",
      "Optimism",
      "BNB Chain",
      "Polygon",
      "Gnosis",
      "Avalanche",
    ],
    assets: [
      "ETH",
      "DAI",
      "cDAI",
      "USDC",
      "USDT",
      "WBTC",
      "BNB",
      "MATIC",
      "xDAI",
      "AVAX",
    ],
    amountModel:
      "Classic uses fixed denominations; Nova supports arbitrary ETH amounts and shielded balances on Gnosis.",
    depositFee: "0%.",
    withdrawalFee:
      "Self-withdrawal pays gas. Optional relayer withdrawals include a relayer-quoted fee.",
    transferFee:
      "Classic has no in-pool transfer. Nova shielded transfers pay execution / relay costs.",
    waitTime:
      "No fixed protocol wait, but docs recommend waiting for later deposits to improve anonymity.",
    transferModel:
      "Classic withdraws to a new public address. Nova can transfer part of a shielded balance to another registered shielded address.",
    privacyModel:
      "A commitment enters a shared pool; a later zk proof spends the note without revealing which deposit it came from.",
    cryptography:
      "zk-SNARK proofs, Merkle trees, nullifiers, Pedersen hashing, and MiMC hashing.",
    compliance:
      "No built-in deposit screening. Users still need to evaluate jurisdiction, counterparty, relayer, RPC, and operational risks.",
    custody:
      "Non-custodial; losing the private note or shielded key can mean losing funds.",
    userCaveat:
      "Strongly sensitive to timing, denomination choice, address reuse, and legal / compliance expectations around interacting with mixer contracts.",
    sources: [
      {
        label: "Ethereum.org listing",
        href: "https://ethereum.org/apps/tornado-cash/",
      },
      {
        label: "IPFS UI source",
        href: "https://github.com/tornadocash/ui-minified",
      },
      {
        label: "Core contracts",
        href: "https://github.com/tornadocash/tornado-core",
      },
      {
        label: "Nova contracts",
        href: "https://github.com/tornadocash/tornado-nova",
      },
      {
        label: "Deployments mirror",
        href: "https://docs.tornadocash.eth.limo/general/deployments.html",
      },
      {
        label: "Post-censorship guide",
        href: "https://docs.tornadocash.eth.limo/general/guides/post-censorship/",
      },
      {
        label: "Treasury update",
        href: "https://home.treasury.gov/news/press-releases/sb0057",
      },
    ],
  },
  {
    id: "railgun",
    name: "RAILGUN",
    provider: "RAILGUN DAO ecosystem",
    status: "Mainnet",
    url: "https://railgun.org/",
    logoDomain: "railgun.org",
    accent: "#33D69F",
    bestFor:
      "Private balances, private sends, and private DeFi interactions after assets are shielded.",
    networks: ["Ethereum", "Arbitrum", "Polygon", "BNB Chain"],
    assets: ["Most ERC-20 tokens", "ERC-721 NFTs", "wrapped base assets"],
    amountModel:
      "Arbitrary token amounts inside encrypted 0zk private balances.",
    depositFee: "0.25% protocol deduction on shield actions.",
    withdrawalFee:
      "0.25% protocol deduction on unshield actions, plus relayer / broadcaster gas premium when used.",
    transferFee:
      "No extra protocol percentage outside shield / unshield. Private transactions still pay relayer / broadcaster gas costs.",
    waitTime:
      "POI wallets currently apply a 1 hour unshield-only standby period for newly shielded funds.",
    transferModel:
      "Send to another 0zk address, unshield to any 0x address, or interact with supported DeFi privately.",
    privacyModel:
      "Private balances are encrypted UTXOs in a shared Merkle tree; transactions appear from broadcasters rather than the user's public wallet.",
    cryptography:
      "zk-SNARK circuits, encrypted UTXOs, nullifiers, Poseidon hashing, and Merkle-tree commitments.",
    compliance:
      "Proof of Innocence checks can prove funds are not from selected public bad-actor lists without exposing balances or history.",
    custody:
      "Non-custodial 0zk keys; viewing keys and spending keys govern private balance visibility and control.",
    userCaveat:
      "Fees depend heavily on chain gas and broadcaster quotes; compliance behavior also depends on the wallet frontend in use.",
    sources: [
      {
        label: "Fees FAQ",
        href: "https://docs.railgun.org/community-faqs/readme/costs-and-fees",
      },
      {
        label: "Getting started",
        href: "https://docs.railgun.org/wiki/learn/getting-started",
      },
      {
        label: "Privacy system",
        href: "https://docs.railgun.org/wiki/learn/privacy-system",
      },
      {
        label: "Shielding tokens",
        href: "https://docs.railgun.org/wiki/learn/shielding-tokens",
      },
      {
        label: "POI",
        href: "https://docs.railgun.org/wiki/assurance/private-proofs-of-innocence",
      },
      {
        label: "Railway standby period",
        href: "https://help.railway.xyz/private-proofs-of-innocence",
      },
    ],
  },
  {
    id: "privacy-pools-v1",
    parentId: "privacy-pools",
    name: "Privacy Pools",
    version: "V1",
    provider: "0xbow",
    status: "Mainnet",
    url: "https://privacypools.com/",
    logoDomain: "privacypools.com",
    accent: "#F6C851",
    bestFor:
      "Compliance-screened private withdrawals from approved deposits across supported mainnet pools.",
    networks: ["Ethereum", "Optimism", "BNB Chain", "Arbitrum"],
    assets: [
      "ETH",
      "USDC",
      "USDT",
      "DAI",
      "WBTC",
      "BNB",
      "USDS",
      "sUSDS",
      "wstETH",
      "USDe",
      "USD1",
      "BOLD",
      "yUSND",
      "BSCUSD",
      "other listed assets",
    ],
    amountModel:
      "Asset-specific pools across Ethereum, Optimism, BNB Chain, and Arbitrum with arbitrary partial or full withdrawals.",
    depositFee:
      "Asset-dependent vetting fee. L2BEAT currently lists 0% for several assets, including DAI, USD1, USDT, WBTC, wstETH, USDS, sUSDS, USDe, frxUSD, fxUSD, and wOETH; 0.5% for ETH, USDC, and BOLD. 0xbow terms describe 0.5% as the default vetting fee and note it may change.",
    withdrawalFee:
      "Direct withdrawals have no protocol relayer fee. Relayed withdrawal fees are selected by relayers and capped per asset at 5% or 10%.",
    transferFee:
      "No general private P2P transfer mode in V1; users withdraw, partially withdraw, or ragequit.",
    waitTime:
      "Deposits must be approved into the Association Set before private withdrawal. Privacy Pools docs do not publish a fixed approval timeframe. Excluded deposits can publicly ragequit.",
    transferModel:
      "Private withdrawal from an approved commitment to a public recipient, optionally through a relayer.",
    privacyModel:
      "Only ASP-approved deposits join the anonymity set; withdrawals prove inclusion without revealing the matching deposit.",
    cryptography:
      "Circom / Groth16 circuits, Poseidon commitments, LeanIMT Merkle proofs, nullifiers, and onchain verifiers.",
    compliance:
      "Association Set Provider whitelists approved deposit labels and can remove deposits from the private withdrawal set.",
    custody:
      "Non-custodial commitments. Ragequit preserves recovery but publicly links the original deposit and exit.",
    userCaveat:
      "The ASP and multisig are part of the trust model; a deposit can be excluded from private withdrawal and forced into public recovery.",
    sources: [
      {
        label: "Overview",
        href: "https://docs.privacypools.com/",
      },
      {
        label: "Deposit flow",
        href: "https://docs.privacypools.com/protocol/deposit",
      },
      {
        label: "Withdrawal flow",
        href: "https://docs.privacypools.com/protocol/withdrawal",
      },
      {
        label: "ASP layer",
        href: "https://docs.privacypools.com/layers/asp",
      },
      {
        label: "UI chain config",
        href: "https://github.com/0xbow-io/privacy-pools-website/blob/main/src/config/chainData.ts",
      },
      {
        label: "Docs deployments",
        href: "https://docs.privacypools.com/deployments",
      },
      {
        label: "L2BEAT fees",
        href: "https://l2beat.com/privacy/projects/privacy-pools",
      },
    ],
  },
  {
    id: "privacy-pools-v2",
    parentId: "privacy-pools",
    name: "Privacy Pools",
    version: "V2",
    provider: "0xbow",
    status: "Public testnet",
    url: "https://v2.privacypools.com/",
    logoDomain: "privacypools.com",
    accent: "#F6C851",
    bestFor:
      "Testing 0xbow's passkey-secured V2 wallet, private transfers, and payment requests on Sepolia.",
    networks: ["Sepolia"],
    assets: ["ETH", "USDC", "USDT"],
    amountModel:
      "Arbitrary Sepolia testnet deposits into ETH, USDC, or USDT shielded notes.",
    depositFee: "0% app-listed deposit fee.",
    withdrawalFee:
      "Relayer-quoted cost through the V2 app; no fixed protocol percentage is published for the testnet.",
    transferFee:
      "Private in-pool transfers are supported and use a relayer quote; no fixed protocol percentage is published.",
    waitTime:
      "Deposits need ASP approval before private actions; no fixed approval timeframe is published for the V2 testnet. Wallets also need a one-time onchain registration before receiving encrypted notes.",
    transferModel:
      "Private transfers and payment requests move shielded notes inside the pool; recipients can import or discover received notes.",
    privacyModel:
      "Shielded notes are held locally and spent with proofs; relayers submit transfer or withdrawal transactions without exposing the user wallet as sender.",
    cryptography:
      "Groth16 zero-knowledge proofs, Poseidon commitments, Merkle / ASP proofs, nullifiers, and registered viewing keys.",
    compliance:
      "The V2 app identifies 0xbow ASP as its compliance provider; approved labels are required before private withdrawal or transfer.",
    custody:
      "Non-custodial testnet notes secured by local wallet / passkey flows. Losing local keys or backups can strand shielded testnet funds.",
    userCaveat:
      "Use Sepolia assets only. The visible app relayer is 0xBow Relayer and quoted fees can change with gas and relayer settings.",
    sources: [
      {
        label: "V2 app",
        href: "https://v2.privacypools.com/",
      },
      {
        label: "0xbow GitHub",
        href: "https://github.com/0xbow-io",
      },
      {
        label: "UI chain config",
        href: "https://github.com/0xbow-io/privacy-pools-website/blob/main/src/config/chainData.ts",
      },
      {
        label: "Relayer fees",
        href: "https://github.com/0xbow-io/privacy-pools-core/blob/main/packages/relayer/README.md",
      },
      {
        label: "Entrypoint fees",
        href: "https://github.com/0xbow-io/privacy-pools-core/blob/main/docs/docs/layers/contracts/entrypoint.md",
      },
      {
        label: "Pool proof model",
        href: "https://github.com/0xbow-io/privacy-pools-core/blob/main/docs/docs/layers/contracts/privacy-pools.md",
      },
    ],
  },
  {
    id: "veil-cash",
    name: "Veil Cash",
    provider: "Veil Cash",
    status: "Mainnet",
    url: "https://www.veil.cash/",
    logoDomain: "veil.cash",
    accent: "#7DE2D1",
    bestFor:
      "Base users who want arbitrary ETH / USDC private transfers with built-in screening.",
    networks: ["Base"],
    assets: ["ETH", "USDC"],
    amountModel:
      "Arbitrary ETH and USDC deposits, private transfers, and withdrawals.",
    depositFee:
      "0.3% on deposits, taken in the same deposit transaction in the app. Minimum shielded amounts are 0.01 ETH or 20 USDC after the fee.",
    withdrawalFee: "Withdrawals use Veil's relayer with no extra relay fee.",
    transferFee:
      "Private transfers use Veil's relayer with no extra relay fee.",
    waitTime:
      "Verified users can be instant. 0xbow screening is usually under 15 minutes, can take up to 5 days, and may include a 6 hour holding period.",
    transferModel:
      "Transfer inside the pool to a registered recipient, or withdraw to any Ethereum address.",
    privacyModel:
      "Shielded balances are encrypted onchain UTXOs; operators and third parties cannot see balances or transfers.",
    cryptography:
      "UTXO model with Groth16 zero-knowledge proofs, Poseidon hashing, encrypted UTXOs, and relayed private actions.",
    compliance:
      "Deposits require Coinbase EAS, Binance BABT, Ethos, or 0xbow KYT screening before they enter the pool.",
    custody:
      "Non-custodial keypair derived from wallet signature, passkey, or imported key. Losing the key can lose pool funds.",
    userCaveat:
      "Live ETH and USDC pools were audited in 2026; older fixed-denomination legacy pools had a recovered verifier incident and should not be confused with the current pools.",
    sources: [
      {
        label: "Protocol intro",
        href: "https://docs.veil.cash/",
      },
      {
        label: "How to use",
        href: "https://docs.veil.cash/veil-cash-pools/how-to-use-veil-cash",
      },
      {
        label: "FAQ",
        href: "https://docs.veil.cash/veil-cash-pools/faq",
      },
      {
        label: "Verified users",
        href: "https://docs.veil.cash/intro/verified-users",
      },
      {
        label: "0xbow screening",
        href: "https://docs.veil.cash/intro/verified-users/0xbow-screening",
      },
      {
        label: "Deployments / audit",
        href: "https://docs.veil.cash/technical/deployments",
      },
      {
        label: "SDK",
        href: "https://github.com/veildotcash/veildotcash-sdk",
      },
    ],
  },
];

export const privacyProtocolGroups: PrivacyProtocolGroup[] = [
  {
    id: "tornado-cash",
    name: "Tornado Cash",
    description:
      "Classic fixed-denomination mixer contracts plus Nova's Gnosis shielded-balance model.",
    entries: privacyProtocols.filter((entry) => entry.id === "tornado-cash"),
  },
  {
    id: "railgun",
    name: "RAILGUN",
    description:
      "Private DeFi middleware with 0zk addresses, encrypted balances, and broadcaster-submitted transactions.",
    entries: privacyProtocols.filter((entry) => entry.id === "railgun"),
  },
  {
    id: "privacy-pools",
    name: "Privacy Pools",
    description:
      "0xbow's ASP-screened privacy pools, shown by version because V2 is currently a separate Sepolia testnet.",
    entries: privacyProtocols.filter(
      (entry) => entry.parentId === "privacy-pools"
    ),
  },
  {
    id: "veil-cash",
    name: "Veil Cash",
    description:
      "Base-native ETH and USDC privacy pools with verified-user and 0xbow-screened deposit paths.",
    entries: privacyProtocols.filter((entry) => entry.id === "veil-cash"),
  },
];

export const comparisonFields = [
  "networks",
  "assets",
  "amountModel",
  "depositFee",
  "withdrawalFee",
  "transferFee",
  "waitTime",
  "privacyModel",
  "cryptography",
  "compliance",
] as const;

export const fieldLabels: Record<(typeof comparisonFields)[number], string> = {
  networks: "Networks",
  assets: "Assets",
  amountModel: "Amount model",
  depositFee: "Deposit fee",
  withdrawalFee: "Withdraw fee",
  transferFee: "In-pool transfer fee",
  waitTime: "Wait / approval",
  privacyModel: "Privacy model",
  cryptography: "Cryptography",
  compliance: "Compliance model",
};

export const allPrivacySources = Array.from(
  new Map(
    privacyProtocols
      .flatMap((protocol) => protocol.sources)
      .map((source) => [source.href, source])
  ).values()
);
