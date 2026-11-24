import { Box, Container, SimpleGrid } from "@chakra-ui/react";
import subdomains from "@/subdomains";
import { ToolsGridHeading } from "./ToolsGridHeading";
import { ToolsGridItem } from "./ToolsGridItem";
import {
  directoryEntries,
  usefulToolEntries,
  toolEntries,
} from "@/data/toolCatalog";

const popularToolEntries = [
  subdomains.CALLDATA.base,
  subdomains.CONTRACT.base,
  subdomains.SOLIDITY.base,
].flatMap((subdomain) => {
  const tool = toolEntries.find(
    (entry) => entry.subdomain === subdomain && !entry.path
  );
  return tool ? [tool] : [];
});
const homepageDeveloperEntries = toolEntries.filter(
  (tool) => !popularToolEntries.includes(tool)
);

export const ToolsGrid = () => {
  return (
    <Box
      position="relative"
      bgGradient="linear(to-b, transparent 0px, bg.800 280px)"
      pt={{ base: 6, md: 8 }}
      pb={{ base: 10, md: 16 }}
      id="all-tools"
    >
      <Container maxW="container.xl" px={{ base: 4, md: 6 }}>
        <Box mb={{ base: 12, md: 16 }}>
          <ToolsGridHeading title="Popular Tools" />
          <SimpleGrid
            columns={{ base: 1, sm: 2, lg: 3 }}
            spacing={{ base: 4, md: 8 }}
          >
            {popularToolEntries.map((tool) => (
              <ToolsGridItem key={tool.subdomain} {...tool} />
            ))}
          </SimpleGrid>
        </Box>
        <SimpleGrid
          columns={{ base: 1, lg: 2 }}
          spacing={{ base: 12, md: 16, lg: 8 }}
          mb={{ base: 12, md: 16 }}
          alignItems="start"
        >
          <Box minW={0}>
            <ToolsGridHeading title="Directories" />

            <SimpleGrid
              columns={{ base: 1, sm: 2 }}
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

          <Box minW={0}>
            <ToolsGridHeading title="Useful Tools" />

            <SimpleGrid
              columns={{ base: 1, sm: 2 }}
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
        </SimpleGrid>

        <ToolsGridHeading title="Tools for Devs" />

        <SimpleGrid
          columns={{ base: 1, sm: 2, lg: 3 }}
          spacing={{ base: 4, md: 8 }}
        >
          {homepageDeveloperEntries.map((tool) => (
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
