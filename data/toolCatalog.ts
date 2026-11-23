import subdomains from "@/subdomains";
import { subdomainToInfo } from "./subdomainToInfo";

const directorySubdomains = [
  subdomains["7702BEAT"].base,
  subdomains.FAUCET.base,
  subdomains.SKILLS.base,
  subdomains.ORGS.base,
  subdomains.RIP.base,
  subdomains.PRIVACY.base,
] as string[];

const directorySubdomainSet = new Set(directorySubdomains);
const migrateSubdomain = subdomains.MIGRATE.base;
const gweiSubdomain = subdomains.GWEI.base;
const usdcPaySubdomain = subdomains.USDC_PAY.base;
const usefulToolSubdomainSet = new Set([
  migrateSubdomain,
  gweiSubdomain,
  usdcPaySubdomain,
]);

export const directoryEntries = directorySubdomains.map(
  (subdomain) =>
    [
      subdomain,
      subdomainToInfo[subdomain as keyof typeof subdomainToInfo],
    ] as const
);

export const usefulToolEntries = [
  [
    migrateSubdomain,
    {
      ...subdomainToInfo[migrateSubdomain],
      label: "Migrate Tokens",
    },
  ],
  [gweiSubdomain, subdomainToInfo[gweiSubdomain]],
  [usdcPaySubdomain, subdomainToInfo[usdcPaySubdomain]],
  [
    "robin-bridge",
    {
      emoji: "🌉",
      label: "Robin Bridge",
      description:
        "Set up and bridge Base tokens to Robinhood Chain, then add ETH liquidity",
      isRelativePath: true,
    },
  ],
] as const;

export type ToolCatalogEntry = {
  subdomain: string;
  path?: string;
  info: {
    emoji: string;
    label: string;
    description: string;
    isRelativePath?: boolean;
  };
};
type DeveloperTool = ToolCatalogEntry;
const orderedDeveloperTools: DeveloperTool[] = [
  {
    subdomain: subdomains.CONTRACT.base,
    info: { ...subdomainToInfo[subdomains.CONTRACT.base], label: "Explorer" },
  },
  ...[
    subdomains.SOLIDITY.base,
    subdomains.ENS.base,
    subdomains.TRANSACT.base,
    subdomains.CONTRACT_DIFF.base,
  ].map((subdomain) => ({ subdomain, info: subdomainToInfo[subdomain] })),
  {
    subdomain: subdomains.CONTRACT.base,
    path: "verify",
    info: {
      emoji: "✅",
      label: "Cross-explorer Verification",
      description:
        "Verify contract source across Etherscan, Blockscout, Routescan and Sourcify.",
    },
  },
];
const orderedDeveloperSubdomains = new Set(
  orderedDeveloperTools.map((tool) => tool.subdomain)
);
const walletDeveloperSubdomains = [
  subdomains.WALLET.base,
  subdomains.EXPLORER.base,
  subdomains.UNISWAP.base,
  subdomains.SAFE.base,
  subdomains.STORAGE_SLOTS.base,
  subdomains.CONVERTER.base,
  subdomains.EPOCH_CONVERTER.base,
  subdomains.DETERMINE_ADDRESS.base,
  subdomains.SIWE.base,
  subdomains.FOUNDRY.base,
  subdomains.CHARACTER_COUNTER.base,
];
const walletDeveloperSubdomainSet = new Set(walletDeveloperSubdomains);
export const toolEntries = Object.entries(subdomainToInfo)
  .filter(
    ([subdomain]) =>
      !directorySubdomainSet.has(subdomain) &&
      !usefulToolSubdomainSet.has(subdomain) &&
      subdomain !== subdomains.CONSTANTS.base
  )
  .flatMap<DeveloperTool>(([subdomain, info]) => {
    if (subdomain === subdomains.CONTRACT.base) return orderedDeveloperTools;
    if (orderedDeveloperSubdomains.has(subdomain)) return [];
    if (subdomain === subdomains.WALLET.base) {
      return walletDeveloperSubdomains.flatMap<DeveloperTool>((subdomain) => {
        const tool = { subdomain, info: subdomainToInfo[subdomain] };
        if (subdomain === subdomains.SAFE.base) {
          return [
            tool,
            {
              subdomain: "mock-tokens",
              info: {
                emoji: "🧪",
                label: "Deploy Mock Tokens",
                description: "Quickly deploy ERC20, ERC721, ERC1155 for testing",
                isRelativePath: true,
              },
            },
          ];
        }
        return subdomain === subdomains.STORAGE_SLOTS.base
          ? [
              tool,
              {
                subdomain: "rpc-console",
                info: {
                  emoji: "🔎",
                  label: "RPC Console",
                  description: "Query blockchain data with JSON-RPC",
                  isRelativePath: true,
                },
              },
            ]
          : [tool];
      });
    }
    if (walletDeveloperSubdomainSet.has(subdomain)) return [];
    return [{ subdomain, info }];
  })
  .concat({
    subdomain: subdomains.CONSTANTS.base,
    info: subdomainToInfo[subdomains.CONSTANTS.base],
  });

export const toolCategories: {
  id: string;
  label: string;
  tools: ToolCatalogEntry[];
}[] = [
  { id: "developers", label: "Tools for Devs", tools: toolEntries },
  {
    id: "useful",
    label: "Useful Tools",
    tools: usefulToolEntries.map(([subdomain, info]) => ({ subdomain, info })),
  },
  {
    id: "directories",
    label: "Directories",
    tools: directoryEntries.map(([subdomain, info]) => ({ subdomain, info })),
  },
];
