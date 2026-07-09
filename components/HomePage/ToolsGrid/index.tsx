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

const directoryEntries = directorySubdomains.map((subdomain) => [
  subdomain,
  subdomainToInfo[subdomain as keyof typeof subdomainToInfo],
] as const);

const toolEntries = Object.entries(subdomainToInfo).filter(
  ([subdomain]) => !directorySubdomainSet.has(subdomain)
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

        <ToolsGridHeading title="Explore Our Tools" />

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
