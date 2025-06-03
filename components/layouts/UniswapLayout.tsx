"use client";

import { HStack, Center } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { Sidebar, SidebarItem } from "@/components/Sidebar";
import subdomains from "@/subdomains";

const SidebarItems: SidebarItem[] = [
  { name: "Tick to Price", path: "tick-to-price" },
  { name: "Pool Price to Target", path: "pool-price-to-target" },
  { name: "Add Liquidity", path: "add-liquidity" },
];

export const UniswapLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Layout>
      <HStack alignItems={"stretch"} h="full">
        <Sidebar
          heading="Uniswap"
          items={SidebarItems}
          subdomain={subdomains.UNISWAP.base}
        />
        <Center flexDir={"column"} w="full">
          {children}
        </Center>
      </HStack>
    </Layout>
  );
};
