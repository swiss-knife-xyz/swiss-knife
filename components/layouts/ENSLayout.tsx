"use client";

import { HStack, Box } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { Sidebar, SidebarItem } from "@/components/Sidebar";
import subdomains from "@/subdomains";

const SidebarItems: SidebarItem[] = [
  { name: "History", path: "history" },
  { name: "CCIP", path: "ccip" },
];

export const ENSLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Layout>
      <HStack alignItems={"stretch"} h="full" spacing={0}>
        <Sidebar
          heading="ENS"
          items={SidebarItems}
          subdomain={subdomains.ENS.base}
        />
        <Box w="full" flex={1} p={6}>
          {children}
        </Box>
      </HStack>
    </Layout>
  );
};
