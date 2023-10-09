"use client";

import Link from "next/link";
import { Box, Button, GridItem, SimpleGrid } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

const subdomainToLabel = {
  [subdomains.CONSTANTS]: "Constants",
  [subdomains.EPOCH_CONVERTER]: "Epoch Converter",
  [subdomains.EXPLORER]: "Explorer",
  [subdomains.CONVERTER]: "Converter",
  [subdomains.TRANSACT]: "Transact",
};

const Btn = ({ subdomain }: { subdomain: string }) => (
  <GridItem>
    <Link href={getPath(subdomain)}>
      <Button w="100%">{subdomainToLabel[subdomain] ?? subdomain}</Button>
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
