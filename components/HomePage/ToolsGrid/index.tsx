import { Box, Container, SimpleGrid } from "@chakra-ui/react";
import { ToolsGridHeading } from "./ToolsGridHeading";
import { subdomainToInfo } from "@/data/subdomainToInfo";
import { ToolsGridItem } from "./ToolsGridItem";

export const ToolsGrid = () => {
  return (
    <Box bg="bg.800" py={{ base: 10, md: 16 }} id="all-tools">
      <Container maxW="container.xl" px={{ base: 4, md: 6 }}>
        <ToolsGridHeading />

        <SimpleGrid
          columns={{ base: 1, sm: 2, lg: 3 }}
          spacing={{ base: 4, md: 8 }}
        >
          {Object.entries(subdomainToInfo).map(([subdomain, info]) => (
            <ToolsGridItem key={subdomain} subdomain={subdomain} info={info} />
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
};
