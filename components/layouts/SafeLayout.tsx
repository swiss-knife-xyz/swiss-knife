"use client";

import { HStack, Center } from "@chakra-ui/react";
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
      <HStack alignItems={"stretch"} h="full" w="full">
        <Sidebar
          heading="Safe"
          items={SidebarItems}
          subdomain={subdomains.SAFE.base}
        />
        <Center flexDir={"column"} w="full">
          {children}
        </Center>
      </HStack>
    </Layout>
  );
};
