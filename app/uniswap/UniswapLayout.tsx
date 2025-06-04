"use client";

import { HStack, Center } from "@chakra-ui/react";
import { FiBarChart, FiTarget, FiPlus, FiRefreshCw } from "react-icons/fi";
import { Layout } from "@/components/Layout";
import { Sidebar, SidebarItem } from "@/components/Sidebar";
import subdomains from "@/subdomains";

const SidebarItems: SidebarItem[] = [
  {
    name: "Tick to Price",
    path: "tick-to-price",
    icon: FiBarChart,
  },
  {
    name: "Swap",
    path: "swap",
    icon: FiRefreshCw,
  },
  {
    name: "Pool Price to Target",
    path: "pool-price-to-target",
    icon: FiTarget,
  },
  {
    name: "Add Liquidity",
    path: "add-liquidity",
    icon: FiPlus,
  },
];

export const UniswapLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Layout>
      <HStack alignItems={"stretch"} h="full" spacing={0}>
        <Sidebar
          heading="🦄 Uniswap"
          items={SidebarItems}
          subdomain={subdomains.UNISWAP.base}
        />
        <Center flexDir={"column"} w="full" flex={1}>
          {children}
        </Center>
      </HStack>
    </Layout>
  );
};
