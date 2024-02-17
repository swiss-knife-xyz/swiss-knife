"use client";

import Link from "next/link";
import { Box, GridItem, SimpleGrid } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";
import { DarkButton } from "@/components/DarkButton";

const subdomainToLabel = {
  [subdomains.CONSTANTS]: "Constants",
  [subdomains.EPOCH_CONVERTER]: "Epoch Converter",
  [subdomains.EXPLORER]: "Explorer",
  [subdomains.CONVERTER]: "Converter",
  [subdomains.TRANSACT]: "Transact",
  [subdomains.CALLDATA]: "Calldata",
  [subdomains.STORAGE_SLOTS]: "Storage Slots",
  [subdomains.UNISWAP]: "Uniswap V3",
  [subdomains.CHARACTER_COUNT]: "Character Counter",
};

const Btn = ({ subdomain }: { subdomain: string }) => (
  <GridItem>
    <Link href={getPath(subdomain)}>
      <DarkButton w="100%">
        {subdomainToLabel[subdomain] ?? subdomain}
      </DarkButton>
    </Link>
  </GridItem>
);

const Home = () => {
  return (
    <Layout>
      <Box minH="50vh">
        <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} gap={6}>
          {Object.values(subdomains).map((subdomain, i) => (
            <Btn key={i} subdomain={subdomain} />
          ))}
        </SimpleGrid>
      </Box>
    </Layout>
  );
};

export default Home;
