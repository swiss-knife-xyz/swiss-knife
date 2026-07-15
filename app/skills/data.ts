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
  | "Security"
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
    id: "goldrush-agent-tools",
    name: "GoldRush Agent Skills & MCP",
    provider: "GoldRush",
    url: "https://goldrush.dev/docs/goldrush-agent-skills/overview",
    logoDomain: "goldrush.dev",
    toolTypes: ["Skill", "MCP", "CLI", "API"],
    categories: ["Data", "NFT", "Cross-chain", "Developer", "Infrastructure"],
    tags: ["100+ chains", "Balances", "Transactions", "Streaming"],
    install: "npx skills add covalenthq/goldrush-agent-skills",
    description:
      "Official GoldRush agent toolkit for blockchain data across 100+ chains. Four skills cover the Foundational and Streaming APIs, the CLI, and x402 access, while the MCP server exposes 50+ tools for balances, transactions, NFTs, approvals, prices, blocks, and cross-chain activity.",
    sourceUrls: [
      "https://goldrush.dev/docs/goldrush-agent-skills/overview",
      "https://github.com/covalenthq/goldrush-agent-skills",
      "https://goldrush.dev/docs/goldrush-mcp-server",
      "https://www.npmjs.com/package/@covalenthq/goldrush-mcp-server",
    ],
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
    id: "walletconnect-agent-sdk",
    name: "WalletConnect Agent SDK",
    provider: "WalletConnect",
    url: "https://github.com/WalletConnect/agent-sdk",
    logoDomain: "walletconnect.network",
    logoBg: "#0b1220",
    toolTypes: ["Skill", "CLI", "Wallet"],
    categories: [
      "Wallet",
      "Commerce",
      "Cross-chain",
      "Developer",
      "Infrastructure",
    ],
    tags: ["WalletConnect", "Signing", "Swidge", "WCT staking"],
    install: "npx skills add WalletConnect/agent-sdk",
    description:
      "Beta WalletConnect agent tooling for wallet connection, message signing, transaction sending, cross-chain bridge/swap flows, WalletConnect Pay payments, and WCT staking from terminal-friendly skills and CLIs. Published packages include walletconnect, walletconnect-staking, and walletconnect-pay commands.",
    sourceUrls: [
      "https://github.com/WalletConnect/agent-sdk",
      "https://www.npmjs.com/package/@walletconnect/cli-sdk",
      "https://www.npmjs.com/package/@walletconnect/staking-cli",
      "https://www.npmjs.com/package/@walletconnect/pay-cli",
      "https://walletconnect.network/",
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
    id: "trustless-ai-agent-sdk",
    name: "Trustless AI Agent SDK",
    provider: "trustless-ai",
    url: "https://github.com/trustless-ai/agent-sdk",
    logoDomain: "github.com",
    logoBg: "#0d1117",
    toolTypes: ["API"],
    categories: ["Security", "Developer", "Infrastructure"],
    tags: ["Verification", "BIP-340", "Nostr", "OpenTimestamps"],
    install: "npm install @trustless-ai/agent-sdk",
    description:
      "JavaScript verification library with a zero-I/O core for trustless agent workflows. It recomputes NIP-01 event IDs and BIP-340 signatures, builds commit-before-outcome events, checks artifact and anchor gates, normalizes EVM job specs, and packs receipt proofs for onchain verification without handling private keys.",
    sourceUrls: [
      "https://github.com/trustless-ai/agent-sdk",
      "https://www.npmjs.com/package/@trustless-ai/agent-sdk",
    ],
  },
  {
    id: "recompute-kit",
    name: "Recompute Kit",
    provider: "trustless-ai",
    url: "https://github.com/trustless-ai/recompute-kit",
    logoDomain: "github.com",
    logoBg: "#0d1117",
    toolTypes: ["MCP", "CLI"],
    categories: ["Security", "Developer", "Infrastructure"],
    tags: ["Verification", "Proofs", "Pinned refs", "Tri-state verdicts"],
    install:
      'git clone https://github.com/trustless-ai/recompute-kit && cd recompute-kit && export PATH="$PWD/bin:$PATH"',
    description:
      "Self-hosted MCP and CLI toolkit that verifies claims by recomputing them from pinned primary artifacts. Its tools cover repositories, citations, CI, onchain calls, commitments, storage and receipt proofs, returning verified-good, verified-bad, or unverifiable verdicts with evidence.",
    sourceUrls: [
      "https://github.com/trustless-ai/recompute-kit",
      "https://github.com/trustless-ai/recompute-kit/blob/main/RECOMPUTE.md",
    ],
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
    id: "dune-agents",
    name: "Dune",
    provider: "Dune",
    url: "https://dune.com/agents",
    logoDomain: "dune.com",
    toolTypes: ["MCP", "CLI", "Skill", "API"],
    categories: ["Data", "Developer"],
    tags: ["DuneSQL", "Dashboards", "Datasets", "x402"],
    install: "curl -sSfL https://dune.com/cli/install.sh | sh",
    description:
      "Official agent surfaces for Dune onchain analytics. Agents can use the remote MCP endpoint or CLI plus skills to discover tables, run DuneSQL, manage queries, generate visualizations, build dashboards, and track credits.",
    sourceUrls: [
      "https://dune.com/agents",
      "https://docs.dune.com/api-reference/agents/mcp",
      "https://docs.dune.com/api-reference/agents/cli-and-skills",
      "https://github.com/duneanalytics/skills",
    ],
  },
  {
    id: "herd-skill",
    name: "Herd",
    provider: "Herd",
    url: "https://herd.eco/skill.md",
    logoDomain: "herd.eco",
    toolTypes: ["Skill", "MCP", "CLI"],
    categories: ["Data", "Developer", "Wallet"],
    tags: ["Explorer", "HAL", "Ethereum", "Base"],
    install: "codex mcp add herd-mcp --url https://mcp.herd.eco/v1",
    description:
      "Skill, remote MCP, and CLI for exploring Ethereum/Base contracts, transactions, and wallets with decoded traces, ABIs, proxy history, labels, balance changes, and HAL actions/adapters.",
    sourceUrls: [
      "https://herd.eco/skill.md",
      "https://docs.herd.eco/herd-mcp/introduction",
      "https://github.com/herd-labs/herd-cli",
    ],
  },
  {
    id: "poidh-bounty",
    name: "poidh Bounty Skill",
    provider: "poidh",
    url: "https://github.com/picsoritdidnthappen/poidh-app/blob/prod/SKILL.md",
    logoDomain: "poidh.xyz",
    toolTypes: ["Skill"],
    categories: ["Commerce", "NFT", "Developer"],
    tags: ["Bounties", "Photo proof", "Arbitrum", "Base"],
    install:
      "Fetch https://raw.githubusercontent.com/picsoritdidnthappen/poidh-app/prod/SKILL.md",
    description:
      "Skill for poidh, the onchain bounty protocol for pics-or-it-didn't-happen proof. Agents can post solo or open bounties, inspect proof URIs, evaluate claims, accept winners, route contributor votes, submit claims, and withdraw payouts on Arbitrum, Base, and Degen Chain.",
    sourceUrls: [
      "https://github.com/picsoritdidnthappen/poidh-app/blob/prod/SKILL.md",
      "https://poidh.xyz/",
    ],
  },
  {
    id: "pashov-skills",
    name: "Pashov Skills",
    provider: "Pashov Audit Group",
    url: "https://github.com/pashov/skills",
    logoDomain: "pashov.com",
    toolTypes: ["Skill"],
    categories: ["Security", "Developer"],
    tags: ["Solidity", "Audits", "Fuzzing", "Threat models"],
    install: "Install https://github.com/pashov/skills/",
    description:
      "Solidity security skills for agents. Includes fizz for Echidna/Medusa fuzz suites, solidity-auditor for AI-assisted vulnerability review, and x-ray for pre-audit threat modeling, invariants, entry points, and git analysis.",
    sourceUrls: ["https://github.com/pashov/skills"],
  },
  {
    id: "eip7702-rescue",
    name: "EIP-7702 Rescue",
    provider: "trustless-ai",
    url: "https://github.com/trustless-ai/eip7702-rescue",
    logoDomain: "github.com",
    logoBg: "#0d1117",
    toolTypes: ["MCP"],
    categories: ["Security", "Wallet", "Developer"],
    tags: ["EIP-7702", "Wallet recovery", "Forensics", "Fork simulation"],
    install:
      "git clone https://github.com/trustless-ai/eip7702-rescue && cd eip7702-rescue && forge build && node mcp/server.mjs",
    description:
      "Key-free forensic MCP for EIP-7702-compromised wallets. It detects active delegation, scans ERC-721 holdings, simulates an atomic sponsored rescue on a disposable Anvil fork, and builds a human-reviewed rescue plan without signing or broadcasting transactions.",
    sourceUrls: [
      "https://github.com/trustless-ai/eip7702-rescue",
      "https://github.com/trustless-ai/eip7702-rescue/blob/main/SPEC.md",
      "https://github.com/trustless-ai/eip7702-rescue/blob/main/CASE.md",
    ],
  },
  {
    id: "quillshield-skills",
    name: "QuillShield Security Skills",
    provider: "QuillShield",
    url: "https://github.com/quillai-network/quillshield_skills",
    logoDomain: "quillai.network",
    logoBg: "#050816",
    toolTypes: ["Skill", "Plugin"],
    categories: ["Security", "Developer"],
    tags: ["Audits", "Invariants", "Reentrancy", "OWASP"],
    install:
      "Install https://github.com/quillai-network/quillshield_skills as a Claude plugin",
    description:
      "Smart contract security skill suite based on the QuillShield audit methodology. It includes plugins for behavioral state analysis, semantic guard gaps, state invariants, reentrancy variants, oracle and flash-loan attack chains, proxy upgrade safety, arithmetic and input validation, external calls, signature replay, and DoS/griefing checks.",
    sourceUrls: [
      "https://github.com/quillai-network/quillshield_skills",
      "https://quillai.network/",
    ],
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
  {
    id: "socket-for-agents",
    name: "Socket for Agents",
    provider: "Socket",
    url: "https://docs.socket.tech/for-agents/intro",
    logoDomain: "socket.tech",
    toolTypes: ["Skill", "API"],
    categories: ["Cross-chain", "DeFi", "Commerce"],
    tags: ["Swaps", "Bridges", "Deposit addresses", "llms.txt"],
    install: "Fetch https://docs.socket.tech/skill.md",
    description:
      "Agent-ready docs for Socket's routing API. The skill.md and llms.txt files cover swap and bridge quotes, execution status, deposit-address flows, supported chains/tokens, and production API access.",
    sourceUrls: [
      "https://docs.socket.tech/for-agents/intro",
      "https://docs.socket.tech/skill.md",
      "https://docs.socket.tech/llms.txt",
    ],
  },
  {
    id: "yo-protocol-skills",
    name: "YO Protocol Skills",
    provider: "YO Protocol",
    url: "https://github.com/yoprotocol/yo-protocol-skills",
    logoDomain: "yo.xyz",
    logoBg: "#050505",
    toolTypes: ["Skill", "CLI", "MCP", "API"],
    categories: ["DeFi", "Developer"],
    tags: ["ERC-4626", "Vaults", "Calldata", "Yield"],
    install: "npx skills add yoprotocol/yo-protocol-skills --all",
    description:
      "Official YO Protocol skills bundle for ERC-4626 yield vaults. It covers the TypeScript SDK, React hooks, agent-first CLI, Base MCP plugin, design guidance, and Risk Graph API for deposits, redeems, positions, vault snapshots, Merkl rewards, and unsigned Gateway calldata across Ethereum, Base, and Arbitrum.",
    sourceUrls: [
      "https://github.com/yoprotocol/yo-protocol-skills",
      "https://www.yo.xyz/",
      "https://www.npmjs.com/package/@yo-protocol/cli",
    ],
  },
  {
    id: "portals-foresight",
    name: "Portals Foresight",
    provider: "Portals.fi",
    url: "https://foresight.portals.fi/docs/skill/",
    logoDomain: "portals.fi",
    toolTypes: ["Skill", "API"],
    categories: ["DeFi", "Developer"],
    tags: ["Simulation", "Transaction preview", "EVM", "x402"],
    install:
      "Save SKILL.md from https://foresight.portals.fi/docs/skill/ to .claude/skills/portals-foresight/SKILL.md",
    description:
      "Claude Code skill and model-agnostic docs for the Portals Foresight API. Agents can simulate single or batch EVM transactions, inspect asset changes, gas costs, token metadata, human-readable reverts, trace/replay transactions, and use x402 pay-per-request access.",
    sourceUrls: [
      "https://foresight.portals.fi/docs/skill/",
      "https://foresight.portals.fi/docs/",
    ],
  },
  {
    id: "fileverse-api",
    name: "Fileverse",
    provider: "Fileverse",
    url: "https://www.npmjs.com/package/@fileverse/api",
    logoDomain: "fileverse.io",
    toolTypes: ["MCP", "CLI", "Skill", "API"],
    categories: ["Developer", "Infrastructure", "Data"],
    tags: ["Encrypted docs", "dDocs", "Markdown", "Collaboration"],
    install:
      "npm install @fileverse/api && npx @fileverse/api --apiKey <key> --rpcUrl <url>",
    description:
      "NPM package for programmatic dDocs access. After enabling Fileverse dDocs developer mode and generating an API key, agents can run the CLI/MCP/API surface to create, read, edit, delete, and sync end-to-end encrypted markdown documents for private human-agent collaboration.",
    sourceUrls: [
      "https://www.npmjs.com/package/@fileverse/api",
      "https://fileverse.io/faq",
      "https://github.com/fileverse",
      "https://clawhub.ai/vijaykrishnavanshi/skills/encrypted-docs",
    ],
  },
  {
    id: "veil-cash-mcp",
    name: "Veil Cash MCP",
    provider: "Veil Cash",
    url: "https://www.npmjs.com/package/@veil-cash/mcp",
    logoDomain: "veil.cash",
    logoBg: "#050505",
    toolTypes: ["MCP"],
    categories: ["Wallet", "Commerce", "Developer"],
    tags: ["Privacy", "Base", "x402", "Calldata"],
    install: "npx -y @veil-cash/mcp",
    description:
      "Local MCP server for Veil Cash on Base. It wraps the Veil Cash SDK with Base MCP-compatible tools for status, balances, x402 quotes, register and deposit calldata, plus confirmed private withdrawals, transfers, UTXO consolidation, and x402 payments when a local VEIL_KEY is configured.",
    sourceUrls: [
      "https://www.npmjs.com/package/@veil-cash/mcp",
      "https://github.com/veildotcash/veil-mcp",
      "https://www.veil.cash/",
    ],
  },
  {
    id: "octav-api",
    name: "Octav API",
    provider: "Octav",
    url: "https://docs.octav.fi/api/ai-development/overview",
    logoDomain: "octav.fi",
    toolTypes: ["Skill", "MCP", "CLI", "API"],
    categories: ["Data", "DeFi", "Wallet"],
    tags: ["Portfolio", "Transactions", "DeFi positions", "x402"],
    install: "npx skills add Octav-Labs/octav-api-skill",
    description:
      "Skill, MCP server, CLI, and AI-ready docs for Octav portfolio data. Agents can query holdings, NAV, DeFi positions, transaction history, historical snapshots, airdrops, sync status, and credit usage.",
    sourceUrls: [
      "https://docs.octav.fi/api/ai-development/overview",
      "https://docs.octav.fi/api/ai-development/mcp-server",
      "https://docs.octav.fi/api/ai-development/cli",
      "https://github.com/Octav-Labs/octav-api-skill",
    ],
  },
  {
    id: "jaw-skill",
    name: "JAW Skill",
    provider: "JAW.id",
    url: "https://docs.jaw.id/llms",
    logoDomain: "jaw.id",
    toolTypes: ["Skill", "Wallet"],
    categories: ["Wallet", "Developer", "Infrastructure"],
    tags: ["Passkeys", "Smart accounts", "ERC-7715", "ENS"],
    install:
      "npx skills add JustaName-id/jaw-skills --skill jaw-sdk-best-practices",
    description:
      "Best-practices skill for the JAW SDK, a drop-in smart account solution for dApps via a standard EIP-1193 provider or wagmi connector — no custom bundler or paymaster wiring required. Covers passkey authentication, ENS-native identity, batched transactions, gas sponsoring, ERC-7715 permissions and session keys, EIP-7702 EOA upgrades, and AI agent delegation.",
    sourceUrls: [
      "https://jaw.id/",
      "https://docs.jaw.id",
      "https://github.com/JustaName-id/jaw-mono",
      "https://github.com/JustaName-id/jaw-skills",
    ],
  },
  {
    id: "foundry-mcp-server",
    name: "Foundry MCP Server",
    provider: "PraneshASP",
    url: "https://github.com/PraneshASP/foundry-mcp-server",
    logoDomain: "getfoundry.sh",
    logoBg: "#111111",
    toolTypes: ["MCP"],
    categories: ["Developer", "Infrastructure", "Data"],
    tags: ["Foundry", "Solidity", "Anvil", "Heimdall"],
    install: "npx @pranesh.asp/foundry-mcp-server",
    description:
      "MCP server for Solidity and onchain development with Foundry. Agents can manage Anvil, run Cast calls and sends, inspect receipts, storage, logs, traces, ABIs, and source, maintain a persistent Forge workspace, deploy scripts, estimate gas, generate wallets, and use Heimdall for bytecode disassembly, calldata decoding, decompilation, and CFGs.",
    sourceUrls: [
      "https://github.com/PraneshASP/foundry-mcp-server",
      "https://www.npmjs.com/package/@pranesh.asp/foundry-mcp-server",
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
  "pendle-ai",
  "opensea-skill",
  "across-skills",
  "socket-for-agents",
  "nethermind-defi-skills",
  "sablier-agent-skills",
  "yo-protocol-skills",
  "octav-api",
  "defillama-skills",
  "dune-agents",
  "coingecko-mcp",
  "blockscout-mcp",
  "tenderly-mcp",
  "portals-foresight",
  "herd-skill",
  "goldrush-agent-tools",
  "poidh-bounty",
  "fileverse-api",
  "veil-cash-mcp",
  "walletconnect-agent-sdk",
  "jaw-skill",
  "steer-cli",
  "bankr-skills",
  "bitrefill-skill",
  "pashov-skills",
  "quillshield-skills",
  "ethskills",
  "foundry-mcp-server",
  "cryo-mcp",
  "eip7702-rescue",
  "nani-qwen",
  "trustless-ai-agent-sdk",
  "recompute-kit",
] as const;

const prioritizedResourceIdMap = new Map<string, number>(
  prioritizedResourceIds.map((id, index) => [id, index])
);

const originalResourceIndexMap = new Map(
  skillResourcesData.map((resource, index) => [resource.id, index])
);

const getResourceSortRank = (resource: SkillResource) => {
  const priorityRank = prioritizedResourceIdMap.get(resource.id);
  if (priorityRank !== undefined) return priorityRank;

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
  "Security",
  "Developer",
  "Infrastructure",
  "Model",
];
