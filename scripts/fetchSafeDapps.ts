import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { walletChains } from "../data/chains";
import { SafeDappInfo } from "../types/safeDapps";
import {
  mainnet,
  unichain,
  base,
  arbitrum,
  polygon,
  optimism,
  bsc,
  avalanche,
  zora,
  celo,
  gnosis,
  ink,
  pulsechain,
  arbitrumSepolia,
  soneium,
  sonic,
  sepolia,
  baseSepolia,
  monadTestnet,
} from "viem/chains";

// Configuration for custom dapps and disabled dapps
const customDappConfig = {
  // List of dapp IDs to disable
  disabled: [
    // === Updated chains in custom ===
    38, // Uniswap
    88, // Revoke.cash
    44, // Yearn
    20, // Curve
    196, // Sky.money
    87, // Aura
    135, // Drips
    parseInt(`51${arbitrum.id}`), // Enzyme - Arbitrum
    parseInt(`51${base.id}`), // Enzyme - Base
    122, // Dump.services
    142, // Pods Yield

    // === Safe Default apps ===
    29, // Transaction Builder
    11, // WalletConnect

    // === Deprecated apps ===
    89, // DustSweeper

    // === not supported in iframe ===
    129, // Bungee Exchange
    1, // dHEDGE
    186, // Fluid
    18, // Aave
    75, // LlamaPay
    49, // Zodiac
    61, // Snapshot
    17, // 1inch
    67, // Ramp Network
    174, // SubQuery Network
    66, // OtoCo
    77, // Bitbond Token Tool
    128, // Hedgey Vesting Tokens
    169, // Gelato
    109, // Giveth
    184, // Sygnum Web3 Recovery
    127, // Hedgey Investor Lockups
    71, // 0xSplits
    123, // Migratooor
    171, // Zodiac Roles
    192, // Kyberswap
    141, // Sablier
    33, // CSV Airdrop
    43, // Drain Account
    205, // Venus Protocol
    207, // Pendle Finance
    165, // Morpho
    28, // StakeWise
    22, // Furucombo
    12, // Synthetix
    13, // Gnosis Auction Starter
    162, // Skyline Digital
    2, // ENS - Ethereum Name Service
    159, // Kiln
    23, // Liquity
    178, // Figment
    14, // Lido Staking
    62, // Bulla Banker
    8, // Idle v4
    47, // DAOhaus
    57, // Rocket Pool
    179, // Gnosis Bridge
    52, // StakeDAO
    37, // Request Finance
    76, // Integral
    70, // Alkemi Earn
    83, // Spool App
    81, // Juicebox
    65, // Kwenta
    156, // oSnap
    168, // Safe{Pass}|{DAO}
    72, // Zodiac Exit App
    73, // Token Approval Manager
    98, // 0xNFTs by Castle
    85, // Cobo Safe App
    31, // Zerion
    110, // Silo Finance
    108, // Exactly
    189, // Nupont.app
    130, // ETH Staking by P2P.org
    131, // Pirex
    121, // Squid
    126, // Index
    176, // Chorus One
    132, // Centrifuge
    133, // Harvest Finance
    119, // LSD Deployer
    124, // NFTMigratooor
    125, // Carbon
    116, // Bunni
    48, // Superfluid
    143, // Hidden Hand
    182, // Threshold USD
    177, // Syrup Finance
    144, // Guild.xyz
    190, // Swell
    149, // Maple Finance
    140, // stakefish
    193, // Brick Towers Staking
    146, // Monerium
    195, // Gearbox
    198, // Niural App
    199, // Yelay App
    209, // Aave Governance
    68, // Trader Joe
    150, // Solid World
    40, // QuickSwap
    161, // Maple Finance Sepolia
  ],

  // List of custom dapps to add
  custom: [
    {
      id: 38,
      name: "Uniswap",
      description: "Swap or provide liquidity on the Uniswap Protocol",
      url: "https://app.uniswap.org",
      iconUrl:
        "https://safe-transaction-assets.safe.global/safe_apps/38/icon.png",
      chains: [
        mainnet.id,
        unichain.id,
        base.id,
        arbitrum.id,
        polygon.id,
        optimism.id,
        bsc.id,
        avalanche.id,
        zora.id,
        celo.id,
      ],
    },
    {
      id: 88,
      name: "Revoke.cash",
      description: "Manage and revoke your token allowances with Revoke.cash",
      url: "https://revoke.cash/",
      iconUrl:
        "https://safe-transaction-assets.safe.global/safe_apps/88/icon.png",
      chains: [
        mainnet.id,
        base.id,
        arbitrum.id,
        avalanche.id,
        bsc.id,
        gnosis.id,
        ink.id,
        optimism.id,
        polygon.id,
        unichain.id,
        zora.id,
        pulsechain.id,
        soneium.id,
        sonic.id,
        sepolia.id,
        arbitrumSepolia.id,
        baseSepolia.id,
        monadTestnet.id,
      ],
    },
    {
      id: 44,
      name: "Yearn",
      description: "The yield protocol for digital assets",
      url: "https://yearn.fi",
      iconUrl:
        "https://safe-transaction-assets.safe.global/safe_apps/44/icon.png",
      chains: [mainnet.id, arbitrum.id, base.id, polygon.id, sonic.id],
    },
    {
      id: 20,
      name: "Curve Finance",
      description:
        "Decentralized exchange liquidity pool designed for extremely efficient stablecoin trading and low-risk income for liquidity providers",
      url: "https://www.curve.finance/",
      iconUrl:
        "https://safe-transaction-assets.safe.global/safe_apps/b979c596-ffd7-43ca-b732-4057479dd282/icon.png",
      chains: [
        mainnet.id,
        base.id,
        arbitrum.id,
        avalanche.id,
        bsc.id,
        gnosis.id,
        ink.id,
        optimism.id,
        polygon.id,
        sonic.id,
        arbitrumSepolia.id,
      ],
    },
    {
      id: 196,
      name: "sky.money",
      description: "Rewards, savings, upgrade, and trade",
      url: "https://app.sky.money/",
      iconUrl:
        "https://safe-transaction-assets.safe.global/safe_apps/abf3c7f9-baa3-42bf-9782-d77433e22fc1/icon.png",
      chains: [mainnet.id, arbitrum.id, base.id, optimism.id, unichain.id],
    },
    {
      id: 87,
      name: "Aura Finance",
      description: "Boosting DeFi yield potential and governance power",
      url: "https://app.aura.finance/",
      iconUrl:
        "https://safe-transaction-assets.safe.global/safe_apps/87/icon.png",
      chains: [
        mainnet.id,
        arbitrum.id,
        avalanche.id,
        base.id,
        gnosis.id,
        optimism.id,
        polygon.id,
      ],
    },
    {
      id: 135,
      name: "Drips",
      description: "Stream & Split any ERC-20 on Ethereum",
      url: "https://www.drips.network/",
      iconUrl:
        "https://safe-transaction-assets.safe.global/safe_apps/135/icon.png",
      chains: [mainnet.id, optimism.id],
    },
    {
      id: 51,
      name: "Enzyme Finance",
      description: "Onchain Asset Management",
      url: "https://app.enzyme.finance",
      iconUrl:
        "https://safe-transaction-assets.safe.global/safe_apps/51/icon.png",
      chains: [arbitrum.id, base.id],
    },
    {
      id: 122,
      name: "dump.services",
      description: "Dump your tokens like a pro",
      url: "https://dump.services/",
      iconUrl:
        "https://safe-transaction-assets.safe.global/safe_apps/122/icon.png",
      chains: [mainnet.id, polygon.id],
    },
    {
      id: 142,
      name: "Pods Yield",
      description:
        "Earn more yield for your DAO treasury without risking the principal",
      url: "https://app.pods.finance",
      iconUrl:
        "https://safe-transaction-assets.safe.global/safe_apps/142/icon.png",
      chains: [mainnet.id, base.id],
    },
  ] as SafeDappInfo[],

  dappsPriority: [
    38, // Uniswap
    157, // Morpho Aave V3-ETH Optimizer
    44, // Yearn
    88, // Revoke.cash
    20, // Curve Finance
    151, // Aerodrome Finance
    155, // Jumper Exchange
    74, // CoW Swap
    93, // Balancer
    35, // Sushi
    91, // PancakeSwap
    21, // DeFi Saver
    196, // sky.money
    34, // Summer.fi
    25, // Velora (formerly ParaSwap)
    87, // Aura Finance
    46, // Origin Unified Defi
    135, // Drips
    138, // Spark
    173, // Arcadia Finance
    26, // Reflexer
    54, // Bancor Network
    152, // Velodrome Finance
    160, // Everstake
    84, // Tenderize
    51, // Enzyme Finance
    90, // Enzyme Finance (Polygon)
    36, // DODO
  ],
};

interface SafeApiResponse {
  id: number;
  name: string;
  description: string;
  url: string;
  iconUrl: string;
  networks: number[];
}

function transformDappInfo(
  dapp: SafeApiResponse,
  chainId: number
): SafeDappInfo {
  const chains = dapp.networks || [];
  // Ensure chainId is included in the chains array
  if (!chains.includes(chainId)) {
    chains.push(chainId);
  }

  return {
    id: dapp.id,
    name: dapp.name,
    description: dapp.description,
    url: dapp.url,
    iconUrl: dapp.iconUrl,
    chains,
  };
}

async function fetchDappsForChain(chainId: number): Promise<SafeDappInfo[]> {
  try {
    const response = await axios.get<SafeApiResponse[]>(
      `https://safe-client.safe.global/v1/chains/${chainId}/safe-apps`
    );
    return response.data.map((dapp) => transformDappInfo(dapp, chainId));
  } catch (error) {
    console.error(`Error fetching dapps for chain ${chainId}:`, error);
    return [];
  }
}

async function main() {
  const allDapps: { [chainId: number]: SafeDappInfo[] } = {};
  const uniqueDapps = new Map<number, SafeDappInfo>(); // Map of dapp ID to dapp info

  // Fetch dapps for all chains
  for (const chain of walletChains) {
    console.log(`Fetching dapps for ${chain.name} (${chain.id})...`);
    const dapps = await fetchDappsForChain(chain.id);
    allDapps[chain.id] = dapps;

    // Add to unique dapps map
    dapps.forEach((dapp) => {
      if (!uniqueDapps.has(dapp.id)) {
        uniqueDapps.set(dapp.id, { ...dapp, chains: dapp.chains || [] });
      } else {
        // If dapp already exists, merge the chains
        const existingDapp = uniqueDapps.get(dapp.id)!;
        const existingChains = existingDapp.chains || [];
        const newChains = dapp.chains || [];
        const mergedChains = Array.from(
          new Set([...existingChains, ...newChains])
        );
        uniqueDapps.set(dapp.id, { ...existingDapp, chains: mergedChains });
      }
    });
  }

  // Create output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), "data", "safe");
  await fs.mkdir(outputDir, { recursive: true });

  // Save original dapps data before filtering
  await fs.writeFile(
    path.join(outputDir, "safe-dapps-original.json"),
    JSON.stringify(Array.from(uniqueDapps.values()), null, 2)
  );

  // Convert unique dapps to array and filter out disabled dapps
  const finalDapps = Array.from(uniqueDapps.values()).filter(
    (dapp) => !customDappConfig.disabled.includes(dapp.id)
  );

  // Add custom dapps
  finalDapps.push(...customDappConfig.custom);

  // Sort dapps according to dappsPriority
  const sortedDapps = [
    // First, add dapps in the priority order
    ...customDappConfig.dappsPriority
      .map((id) => finalDapps.find((dapp) => dapp.id === id))
      .filter((dapp): dapp is SafeDappInfo => dapp !== undefined),
    // Then add remaining dapps that weren't in the priority list
    ...finalDapps.filter(
      (dapp) => !customDappConfig.dappsPriority.includes(dapp.id)
    ),
  ];

  // Save chain-specific data
  await fs.writeFile(
    path.join(outputDir, "dapps-by-chain.json"),
    JSON.stringify(allDapps, null, 2)
  );

  // Save unique dapps data
  await fs.writeFile(
    path.join(outputDir, "dapps.json"),
    JSON.stringify(sortedDapps, null, 2)
  );

  console.log("✅ Safe dapps data has been fetched and saved successfully!");
  console.log(`📁 Data files saved in: ${outputDir}`);
}

main().catch(console.error);
