import { Box, Container, SimpleGrid } from "@chakra-ui/react";
import { ToolsGridHeading } from "./ToolsGridHeading";
import { ToolsGridItem } from "./ToolsGridItem";
import {
  directoryEntries,
  usefulToolEntries,
  toolEntries,
} from "@/data/toolCatalog";

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
