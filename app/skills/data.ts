export type AiToolType =
  | "Skill"
  | "MCP"
  | "CLI"
  | "Wallet"
  | "Model"
  | "Plugin"
  | "API";

export type SkillResourceCategory =
  | "DeFi"
  | "Data"
  | "Wallet"
  | "Commerce"
  | "Trading"
  | "NFT"
  | "Cross-chain"
  | "Developer"
  | "Model"
  | "Infrastructure";

export type SkillResource = {
  id: string;
  name: string;
  provider: string;
  url: string;
  logoDomain: string;
  logoBg?: string;
  toolTypes: AiToolType[];
  categories: SkillResourceCategory[];
  tags: string[];
  install?: string;
  description: string;
  sourceUrls: string[];
};

const skillResourcesData: SkillResource[] = [
  {
    id: "hyperliquid-cli",
    name: "Hyperliquid CLI",
    provider: "hypurrclaw",
    url: "https://github.com/hypurrclaw/hyperliquid-cli",
    logoDomain: "hyperliquid.xyz",
    logoBg: "#061f1d",
    toolTypes: ["CLI", "Wallet"],
    categories: ["Trading", "Wallet"],
    tags: ["Hyperliquid", "Perps", "JSON", "Dry runs"],
    install:
      "curl -fsSLO https://raw.githubusercontent.com/hypurrclaw/hyperliquid-cli/main/install.sh && sh install.sh",
    description:
      "Agent-first Rust CLI and encrypted wallet for Hyperliquid. It exposes markets, orders, transfers, staking, vaults, borrow/lend, and streams as JSON commands with schemas, dry runs, and prompt gates.",
    sourceUrls: ["https://github.com/hypurrclaw/hyperliquid-cli"],
  },
  {
    id: "ethskills",
    name: "ETHSkills",
    provider: "ETHSkills",
    url: "https://ethskills.com/",
    logoDomain: "ethskills.com",
    toolTypes: ["Skill"],
    categories: ["Developer", "Infrastructure"],
    tags: ["Ethereum", "Solidity", "Security", "Testing"],
    install: "Fetch https://ethskills.com/SKILL.md",
    description:
      "Ethereum skill pack for agents with modules for protocol roadmap, gas, wallets, L2s, standards, tooling, addresses, testing, indexing, frontend UX, security, and audits.",
    sourceUrls: ["https://ethskills.com/"],
  },
  {
    id: "sablier-agent-skills",
    name: "Sablier Agent Skills",
    provider: "Sablier",
    url: "https://blog.sablier.com/sablier-agent-skills-onchain-token-vesting-powered-by-ai",
    logoDomain: "sablier.com",
    toolTypes: ["Skill"],
    categories: ["DeFi"],
    tags: ["Vesting", "Streams", "Airdrops", "Payments"],
    install: "npx skills add sablier-labs/sablier-skills",
    description:
      "Skills for creating vesting streams, payment streams, Merkle airdrops, and protocol context. Agents validate inputs, choose Sablier modules, and guide the user through onchain signing.",
    sourceUrls: [
      "https://blog.sablier.com/sablier-agent-skills-onchain-token-vesting-powered-by-ai",
    ],
  },
  {
    id: "coingecko-mcp",
    name: "CoinGecko MCP",
    provider: "CoinGecko",
    url: "https://mcp.api.coingecko.com/",
    logoDomain: "coingecko.com",
    toolTypes: ["MCP"],
    categories: ["Data"],
    tags: ["Prices", "Markets", "NFTs", "Onchain pools"],
    install: "https://mcp.api.coingecko.com/mcp",
    description:
      "Remote MCP server for live prices, market caps, historical charts, DeFi/onchain pool data, NFT collection analytics, exchanges, and trending discovery. Shared public access works without an API key.",
    sourceUrls: ["https://mcp.api.coingecko.com/"],
  },
  {
    id: "cryo-mcp",
    name: "Cryo MCP",
    provider: "z80dev",
    url: "https://github.com/z80dev/cryo-mcp",
    logoDomain: "github.com",
    toolTypes: ["MCP"],
    categories: ["Data", "Developer"],
    tags: ["Cryo", "Ethereum", "SQL", "DuckDB"],
    install: "uvx cryo-mcp --rpc-url <ETH_RPC_URL>",
    description:
      "MCP server for Cryo blockchain extraction. Agents can query block ranges, contracts, datasets, schemas, and downloaded Parquet data with SQL.",
    sourceUrls: ["https://github.com/z80dev/cryo-mcp"],
  },
  {
    id: "blockscout-mcp",
    name: "Blockscout MCP",
    provider: "Blockscout",
    url: "https://mcp.blockscout.com/",
    logoDomain: "blockscout.com",
    toolTypes: ["MCP", "Skill"],
    categories: ["Data", "Infrastructure"],
    tags: ["Explorer", "Contracts", "NFTs", "Multichain"],
    install: "https://mcp.blockscout.com/mcp",
    description:
      "MCP and REST surface over Blockscout APIs for balances, tokens, NFTs, transactions, blocks, verified contract code, ABIs, ENS lookup, token lookup, and read-only contract calls.",
    sourceUrls: [
      "https://mcp.blockscout.com/",
      "https://docs.blockscout.com/devs/mcp-server",
      "https://github.com/blockscout/mcp-server",
    ],
  },
  {
    id: "walletchan-mcp",
    name: "WalletChan MCP",
    provider: "WalletChan",
    url: "https://www.npmjs.com/package/@walletchan/mcp",
    logoDomain: "walletchan.com",
    toolTypes: ["MCP", "Wallet"],
    categories: ["Wallet", "DeFi"],
    tags: ["WalletConnect", "ERC-7710", "Delegation", "Base"],
    install: "npx -y @walletchan/mcp",
    description:
      "Local MCP adapter that connects agents to WalletChan accounts. It supports popup approvals, portfolio reads, swaps, bridges, prepared calls, scoped delegated execution, and Base MCP-style DeFi skills.",
    sourceUrls: [
      "https://www.npmjs.com/package/@walletchan/mcp",
      "https://walletchan.com/",
    ],
  },
  {
    id: "morpho-agents",
    name: "Morpho Agents",
    provider: "Morpho",
    url: "https://morpho.org/blog/introducing-morpho-agents-beta-interface-built-for-ai-agents/",
    logoDomain: "morpho.org",
    toolTypes: ["MCP", "CLI", "Skill"],
    categories: ["DeFi"],
    tags: ["Lending", "Simulation", "Ethereum", "Base"],
    install: "npx skills add morpho-org/morpho-skills",
    description:
      "Beta agent interface for Morpho. The User Agent gives AI assistants CLI/MCP read, simulate, and write access across Ethereum and Base, while Builder Agent teaches agents to integrate Morpho safely.",
    sourceUrls: [
      "https://morpho.org/blog/introducing-morpho-agents-beta-interface-built-for-ai-agents/",
    ],
  },
  {
    id: "pendle-ai",
    name: "Pendle AI",
    provider: "Pendle",
    url: "https://github.com/pendle-finance/pendle-ai",
    logoDomain: "pendle.finance",
    toolTypes: ["Skill", "MCP", "Plugin"],
    categories: ["DeFi", "Trading"],
    tags: ["Yield", "LP", "Limit orders", "Boros"],
    install: "/plugin marketplace add pendle-finance/pendle-ai",
    description:
      "AI plugins, skills, and MCP servers for Pendle V2 and Boros. Agents can trade yield tokens, manage LP positions, place limit orders, and query DeFi market data across EVM chains.",
    sourceUrls: ["https://github.com/pendle-finance/pendle-ai"],
  },
  {
    id: "uniswap-ai",
    name: "Uniswap AI",
    provider: "Uniswap",
    url: "https://github.com/Uniswap/uniswap-ai",
    logoDomain: "uniswap.org",
    toolTypes: ["Skill", "Plugin"],
    categories: ["DeFi", "Trading", "Developer"],
    tags: ["Swaps", "V4 hooks", "x402", "Trading bots"],
    install: "npx skills add Uniswap/uniswap-ai",
    description:
      "Uniswap-specific skills, plugins, and agents for swap integration, pay-with-any-token flows, v4 hooks, viem/wagmi integration, DCA bots, index bots, and copy-trading workflows.",
    sourceUrls: ["https://github.com/Uniswap/uniswap-ai"],
  },
  {
    id: "nethermind-defi-skills",
    name: "DeFi Skills",
    provider: "Nethermind",
    url: "https://defi-skills.nethermind.io/",
    logoDomain: "nethermind.io",
    toolTypes: ["Skill", "CLI", "API"],
    categories: ["DeFi", "Developer"],
    tags: ["Unsigned txs", "Aave V3", "Uniswap V3", "Playbooks"],
    install: "pip install defi-skills",
    description:
      "Deterministic engine that converts DeFi intents into unsigned ABI-encoded transaction payloads. JSON playbooks define protocol actions, approvals, parameters, and ABI mappings for CLI, API, and agent skill use.",
    sourceUrls: [
      "https://defi-skills.nethermind.io/",
      "https://github.com/NethermindEth/defi-skills",
    ],
  },
  {
    id: "tenderly-mcp",
    name: "Tenderly MCP",
    provider: "Tenderly",
    url: "https://docs.tenderly.co/ai-tools/quickstart",
    logoDomain: "tenderly.co",
    toolTypes: ["MCP"],
    categories: ["Developer", "Infrastructure"],
    tags: ["Simulation", "Tracing", "Projects", "OAuth"],
    install:
      "claude mcp add tenderly --transport http https://mcp.tenderly.co/mcp",
    description:
      "MCP server for Tenderly AI tooling. Agents can authenticate with Tenderly, set active project context, and use Tenderly simulation, virtual environment, trace, and project workflows from MCP clients.",
    sourceUrls: ["https://docs.tenderly.co/ai-tools/quickstart"],
  },
  {
    id: "nani-qwen",
    name: "Nani Qwen 3.5 2B",
    provider: "NaniDAO",
    url: "https://huggingface.co/NaniDAO/nani-qwen-3.5-2B-gguf-q4km",
    logoDomain: "huggingface.co",
    toolTypes: ["Model"],
    categories: ["Model", "Wallet"],
    tags: ["Open weights", "Tool calling", "Local", "Wallet assistant"],
    install: "ollama create nani -f Modelfile",
    description:
      "GGUF Q4_K_M model fine-tuned from Qwen3.5-2B for crypto wallet tool calling. It was trained on 2,029 examples covering 103 blockchain tools and is designed for local inference.",
    sourceUrls: [
      "https://huggingface.co/NaniDAO/nani-qwen-3.5-2B-gguf-q4km",
      "https://x.com/nani__ooo/status/2034285434701050162",
    ],
  },
  {
    id: "defillama-skills",
    name: "DefiLlama Skills",
    provider: "DefiLlama",
    url: "https://github.com/DefiLlama/defillama-skills",
    logoDomain: "defillama.com",
    toolTypes: ["Skill", "MCP"],
    categories: ["Data", "DeFi"],
    tags: ["Analytics", "Yield", "Risk", "Market data"],
    install: "npx skills add DefiLlama/defillama-skills --yes",
    description:
      "Skills for the DefiLlama MCP with guided workflows for DeFi market snapshots, protocol deep dives, token research, chain ecosystems, yield strategies, risk, flows, events, and institutional crypto.",
    sourceUrls: ["https://github.com/DefiLlama/defillama-skills"],
  },
  {
    id: "fluid-skill",
    name: "Fluid Skill",
    provider: "Fluid",
    url: "https://fluid.io/skill.md",
    logoDomain: "fluid.io",
    toolTypes: ["Skill"],
    categories: ["DeFi"],
    tags: ["Lending", "Vaults", "ERC-4626", "Onchain resolvers"],
    install: "Fetch https://fluid.io/skill.md",
    description:
      "Skill for Fluid lending and vault products. Agents can read fToken positions, APY, TVL, and vault data through onchain resolver contracts with no API keys across Ethereum, Arbitrum, Base, Polygon, and Plasma.",
    sourceUrls: ["https://fluid.io/skill.md"],
  },
  {
    id: "opensea-skill",
    name: "OpenSea Skills",
    provider: "OpenSea",
    url: "https://github.com/ProjectOpenSea/opensea-skill",
    logoDomain: "opensea.io",
    toolTypes: ["Skill", "MCP", "CLI"],
    categories: ["NFT", "Trading", "Wallet"],
    tags: ["Seaport", "NFT data", "Swaps", "Tool registry"],
    install: "npx skills add ProjectOpenSea/opensea-skill --yes",
    description:
      "Router skill for OpenSea data, marketplace trading, ERC20 swaps, wallet signing providers, and AI-callable tool endpoints. Includes subskills for API, marketplace, swaps, wallet, and tool registry workflows.",
    sourceUrls: ["https://github.com/ProjectOpenSea/opensea-skill"],
  },
  {
    id: "steer-cli",
    name: "Steer CLI",
    provider: "Steer Protocol",
    url: "https://www.npmjs.com/package/@steerprotocol/cli",
    logoDomain: "steer.finance",
    toolTypes: ["CLI", "MCP", "Skill"],
    categories: ["DeFi", "Data"],
    tags: ["ALM", "Liquidity", "Vaults", "Read-only"],
    install: "npx @steerprotocol/cli status",
    description:
      "Read-only operational CLI for Steer Protocol. It exposes live protocol status, chain and protocol discovery, market inspection, liquidity depth analysis, ALM vault inspection, generated skills, and MCP stdio mode.",
    sourceUrls: ["https://www.npmjs.com/package/@steerprotocol/cli"],
  },
  {
    id: "polymarket-cli",
    name: "Polymarket CLI",
    provider: "Polymarket",
    url: "https://github.com/Polymarket/polymarket-cli",
    logoDomain: "polymarket.com",
    toolTypes: ["CLI"],
    categories: ["Trading", "Data"],
    tags: ["Prediction markets", "CLOB", "JSON", "Rust"],
    install: "brew install polymarket",
    description:
      "Rust CLI for Polymarket. Agents can browse markets and events, read CLOB order books and prices, inspect positions and onchain data, and use JSON output before wallet-enabled trading flows.",
    sourceUrls: ["https://github.com/Polymarket/polymarket-cli"],
  },
  {
    id: "across-skills",
    name: "Across Skills",
    provider: "Across",
    url: "https://skills.across.to/",
    logoDomain: "across.to",
    toolTypes: ["Skill", "MCP"],
    categories: ["Cross-chain", "DeFi"],
    tags: ["Bridge", "Swap API", "Embedded actions", "Tracking"],
    install: "https://mcp.across.to/mcp",
    description:
      "Crosschain knowledge base and MCP endpoint for AI agents. It covers Across swap API, suggested fees, embedded crosschain actions, deposit tracking, chains/tokens, integration resources, and security checks.",
    sourceUrls: ["https://skills.across.to/"],
  },
  {
    id: "base-mcp",
    name: "Base MCP",
    provider: "Base",
    url: "https://docs.base.org/agents/quickstart",
    logoDomain: "base.org",
    toolTypes: ["MCP", "Skill", "Wallet"],
    categories: ["Wallet", "DeFi", "Infrastructure"],
    tags: ["Base Account", "x402", "Swaps", "Contract calls"],
    install: "codex mcp add base-mcp --url https://mcp.base.org/",
    description:
      "Base MCP connects agents to wallet and onchain tools on Base. It supports wallet/portfolio checks, sends, swaps, transaction history, message signing, contract calls, x402 payments, and a persistent skill package.",
    sourceUrls: ["https://docs.base.org/agents/quickstart"],
  },
  {
    id: "bankr-skills",
    name: "Bankr Skills",
    provider: "BankrBot",
    url: "https://skills.bankr.bot/",
    logoDomain: "bankr.bot",
    toolTypes: ["Skill", "CLI", "Wallet", "API"],
    categories: ["Wallet", "Trading", "DeFi", "Developer"],
    tags: ["Swaps", "Token launches", "x402", "LLM gateway"],
    install:
      "install the bankr skill from https://github.com/BankrBot/skills/tree/main/bankr",
    description:
      "Catalog of plug-and-play skills for Bankr-powered agents. The Bankr skill adds a wallet API and natural-language flows for trading, token launches, raw transactions, x402 paid APIs, and LLM access funded by a Bankr wallet.",
    sourceUrls: [
      "https://skills.bankr.bot/",
      "https://github.com/BankrBot/skills",
    ],
  },
  {
    id: "bitrefill-skill",
    name: "Bitrefill Skill",
    provider: "Bitrefill",
    url: "https://www.bitrefill.com/agents/SKILL.md",
    logoDomain: "bitrefill.com",
    toolTypes: ["Skill", "MCP", "CLI", "API"],
    categories: ["Commerce", "Wallet", "Developer"],
    tags: ["Gift cards", "eSIMs", "Mobile top-ups", "x402"],
    install: "Fetch https://www.bitrefill.com/agents/SKILL.md",
    description:
      "Agent skill for browsing and buying Bitrefill digital goods across 180+ countries and 1,500+ brands. It routes agents across Bitrefill MCP, x402 REST via Base MCP, CLI, REST API, browser fallback, and wallet/payment options.",
    sourceUrls: [
      "https://www.bitrefill.com/agents/SKILL.md",
      "https://github.com/bitrefill/agents",
      "https://docs.bitrefill.com",
    ],
  },
];

const prioritizedResourceIds = [
  "polymarket-cli",
  "hyperliquid-cli",
  "walletchan-mcp",
  "base-mcp",
  "uniswap-ai",
  "morpho-agents",
  "fluid-skill",
  "across-skills",
  "pendle-ai",
  "opensea-skill",
  "nethermind-defi-skills",
] as const;

const prioritizedResourceIdMap = new Map<string, number>(
  prioritizedResourceIds.map((id, index) => [id, index])
);

const trailingResourceIds = ["nani-qwen", "cryo-mcp"] as const;

const trailingResourceIdMap = new Map<string, number>(
  trailingResourceIds.map((id, index) => [id, index])
);

const originalResourceIndexMap = new Map(
  skillResourcesData.map((resource, index) => [resource.id, index])
);

const getResourceSortRank = (resource: SkillResource) => {
  const priorityRank = prioritizedResourceIdMap.get(resource.id);
  if (priorityRank !== undefined) return priorityRank;

  const trailingRank = trailingResourceIdMap.get(resource.id);
  if (trailingRank !== undefined) {
    return Number.MAX_SAFE_INTEGER - trailingResourceIds.length + trailingRank;
  }

  return (
    prioritizedResourceIds.length +
    (originalResourceIndexMap.get(resource.id) ?? skillResourcesData.length)
  );
};

export const skillResources: SkillResource[] = [...skillResourcesData].sort(
  (first, second) => getResourceSortRank(first) - getResourceSortRank(second)
);

export const aiToolTypeOrder: AiToolType[] = [
  "Skill",
  "MCP",
  "CLI",
  "Wallet",
  "Model",
  "Plugin",
  "API",
];

export const categoryOrder: SkillResourceCategory[] = [
  "DeFi",
  "Data",
  "Wallet",
  "Commerce",
  "Trading",
  "NFT",
  "Cross-chain",
  "Developer",
  "Infrastructure",
  "Model",
];
