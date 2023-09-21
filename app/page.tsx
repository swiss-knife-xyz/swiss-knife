"use client";

import Link from "next/link";
import { Button, GridItem, SimpleGrid } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

const subdomainToLabel = {
  [subdomains.CONSTANTS]: "Constants",
  [subdomains.EPOCH_CONVERTER]: "Epoch Converter",
  [subdomains.EXPLORER]: "Explorer",
  [subdomains.ETH_CONVERTER]: "ETH Converter",
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
      <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} gap={6}>
        {Object.values(subdomains).map((subdomain, i) => (
          <Btn key={i} subdomain={subdomain} />
        ))}
      </SimpleGrid>
    </Layout>
  );
};

export default Home;
