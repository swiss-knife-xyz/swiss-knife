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
    migrateSubdomain,
    {
      ...subdomainToInfo[migrateSubdomain],
      label: "Migrate Tokens",
    },
  ],
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
  [gweiSubdomain, subdomainToInfo[gweiSubdomain]],
  [usdcPaySubdomain, subdomainToInfo[usdcPaySubdomain]],
] as const;

const toolEntries = Object.entries(subdomainToInfo).filter(
  ([subdomain]) =>
    !directorySubdomainSet.has(subdomain) &&
    !usefulToolSubdomainSet.has(subdomain)
);

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
          {toolEntries.map(([subdomain, info]) => (
            <ToolsGridItem key={subdomain} subdomain={subdomain} info={info} />
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
};
