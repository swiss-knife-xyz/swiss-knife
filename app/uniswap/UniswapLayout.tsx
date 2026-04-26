"use client";

import { HStack, Box } from "@chakra-ui/react";
import {
  FiBarChart,
  FiTarget,
  FiPlus,
  FiRefreshCw,
  FiZap,
  FiUser,
} from "react-icons/fi";
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
  {
    name: "Initialize Pool",
    path: "initialize-pool",
    icon: FiZap,
  },
  {
    name: "Positions",
    path: "positions",
    icon: FiUser,
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
        <Box w="full" flex={1} p={6}>
          {children}
        </Box>
      </HStack>
    </Layout>
  );
};
