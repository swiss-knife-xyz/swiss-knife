"use client";

import Link from "next/link";
import { Box, GridItem, SimpleGrid } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";
import { DarkButton } from "@/components/DarkButton";

const subdomainToLabel = {
  [subdomains.CONSTANTS.base]: "Constants",
  [subdomains.EPOCH_CONVERTER.base]: "Epoch Converter",
  [subdomains.EXPLORER.base]: "Explorer",
  [subdomains.CONVERTER.base]: "Converter",
  [subdomains.TRANSACT.base]: "Transact",
  [subdomains.CALLDATA.base]: "Calldata",
  [subdomains.STORAGE_SLOTS.base]: "Storage Slots",
  [subdomains.UNISWAP.base]: "Uniswap V3",
  [subdomains.CHARACTER_COUNT.base]: "Character Counter",
  [subdomains.CONTRACT_ADDRESS.base]: "Contract Address",
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
            <Btn key={i} subdomain={subdomain.base} />
          ))}
        </SimpleGrid>
      </Box>
    </Layout>
  );
};

export default Home;
