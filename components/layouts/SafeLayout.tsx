"use client";

import { HStack, Box } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { Sidebar, SidebarItem } from "@/components/Sidebar";
import subdomains from "@/subdomains";

const SidebarItems: SidebarItem[] = [
  { name: "Calldata Decoder", path: "calldata-decoder" },
  { name: "EIP-712 Hash", path: "eip-712-hash" },
];

export const SafeLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Layout>
      <HStack alignItems={"stretch"} h="full" w="full" spacing={0}>
        <Sidebar
          heading="Safe"
          items={SidebarItems}
          subdomain={subdomains.SAFE.base}
        />
        <Box w="full" flex={1} p={6}>
          {children}
        </Box>
      </HStack>
    </Layout>
  );
};
