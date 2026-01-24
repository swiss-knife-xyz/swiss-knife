"use client";

import { HStack, Box } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { Sidebar, SidebarItem } from "@/components/Sidebar";
import subdomains from "@/subdomains";

const SidebarItems: SidebarItem[] = [
  { name: "Stack Tracer UI", path: "forge-stack-tracer-ui" },
];

export const FoundryLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Layout>
      <HStack alignItems={"stretch"} h="full" spacing={0}>
        <Sidebar
          heading="Forge"
          items={SidebarItems}
          subdomain={subdomains.FOUNDRY.base}
        />
        <Box w="full" flex={1} p={6}>
          {children}
        </Box>
      </HStack>
    </Layout>
  );
};
