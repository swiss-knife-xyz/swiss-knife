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
  [subdomains.CHARACTER_COUNTER.base]: "Character Counter",
  [subdomains.CONTRACT_ADDRESS.base]: "Contract Address",
  [subdomains.CONTRACT_DIFF.base]: "Contract Diff",
  [subdomains.FOUNDRY.base]: "Foundry",
  [subdomains.WALLET.base]: "Wallet",
  [subdomains.ENS.base]: "ENS",
  [subdomains["7702BEAT"].base]: "7702 Beat",
  [subdomains.SAFE.base]: "Safe",
  [subdomains.APPS.base]: "Apps",
};

const Btn = ({
  subdomain,
  isRelativePath,
}: {
  subdomain: string;
  isRelativePath?: boolean;
}) => (
  <GridItem>
    <Link href={getPath(subdomain, isRelativePath)}>
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
            <Btn
              key={i}
              subdomain={subdomain.base}
              isRelativePath={subdomain.isRelativePath}
            />
          ))}
        </SimpleGrid>
      </Box>
    </Layout>
  );
};

export default Home;
