import type { ComponentProps } from "react";
import { Box, Container, SimpleGrid } from "@chakra-ui/react";
import { ToolsGridHeading } from "./ToolsGridHeading";
import { subdomainToInfo } from "@/data/subdomainToInfo";
import { ToolsGridItem } from "./ToolsGridItem";
import subdomains from "@/subdomains";

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

const directoryEntries = directorySubdomains.map(
  (subdomain) =>
    [
      subdomain,
      subdomainToInfo[subdomain as keyof typeof subdomainToInfo],
    ] as const
);

const usefulToolEntries = [
  [
    "mock-tokens",
    {
      emoji: "🧪",
      label: "Deploy Mock Tokens",
      description:
        "Mintable ERC20, ERC721 & ERC1155 — explicit testnet or mainnet and gas review",
      isRelativePath: true,
    },
  ],
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

type DeveloperTool = ComponentProps<typeof ToolsGridItem>;
const orderedDeveloperTools: DeveloperTool[] = [
  {
    subdomain: subdomains.CONTRACT.base,
    info: { ...subdomainToInfo[subdomains.CONTRACT.base], label: "Explorer" },
  },
  ...[
    subdomains.STORAGE_SLOTS.base,
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
  subdomains.SOLIDITY.base,
  subdomains.CONVERTER.base,
  subdomains.EPOCH_CONVERTER.base,
  subdomains.DETERMINE_ADDRESS.base,
  subdomains.SIWE.base,
  subdomains.FOUNDRY.base,
  subdomains.CHARACTER_COUNTER.base,
];
const walletDeveloperSubdomainSet = new Set(walletDeveloperSubdomains);
const toolEntries = Object.entries(subdomainToInfo)
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
        return subdomain === subdomains.SOLIDITY.base
          ? [tool, {
              subdomain: "rpc-console",
              info: {
                emoji: "🔎",
                label: "RPC Console",
                description: "Query blockchain data with JSON-RPC",
                isRelativePath: true,
              },
            }]
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

export const ToolsGrid = () => {
  return (
    <Box bg="bg.800" py={{ base: 10, md: 16 }} id="all-tools">
      <Container maxW="container.xl" px={{ base: 4, md: 6 }}>
        <Box mb={{ base: 12, md: 16 }}>
          <ToolsGridHeading title="Directories" />

          <SimpleGrid
            columns={{ base: 1, sm: 2, lg: 3, xl: 5 }}
            spacing={{ base: 4, md: 6 }}
          >
            {directoryEntries.map(([subdomain, info]) => (
              <ToolsGridItem
                key={subdomain}
                subdomain={subdomain}
                info={info}
              />
            ))}
          </SimpleGrid>
        </Box>

        <Box mb={{ base: 12, md: 16 }}>
          <ToolsGridHeading title="Useful Tools" />

          <SimpleGrid
            columns={{ base: 1, sm: 2, lg: 4 }}
            spacing={{ base: 4, md: 6 }}
          >
            {usefulToolEntries.map(([subdomain, info]) => (
              <ToolsGridItem
                key={subdomain}
                subdomain={subdomain}
                info={info}
              />
            ))}
          </SimpleGrid>
        </Box>

        <ToolsGridHeading title="Tools for Devs" />

        <SimpleGrid
          columns={{ base: 1, sm: 2, lg: 3 }}
          spacing={{ base: 4, md: 8 }}
        >
          {toolEntries.map((tool) => (
            <ToolsGridItem
              key={`${tool.subdomain}/${tool.path ?? ""}`}
              {...tool}
            />
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
};
