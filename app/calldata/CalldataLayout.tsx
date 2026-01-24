// creating separate component here, so that we can keep "use client" here and not in the actual layout to enable setting metadata
"use client";

import { HStack, Center } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { Sidebar, SidebarItem } from "@/components/Sidebar";
import subdomains from "@/subdomains";

const SidebarItems: SidebarItem[] = [
  { name: "Decoder", path: "decoder" },
  { name: "Encoder", path: "encoder" },
  { name: "Viem Error Simulate", path: "viem-error-simulate" },
];

export const CalldataLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Layout>
      <HStack alignItems={"stretch"} h="full" w="full">
        <Sidebar
          heading="Calldata"
          items={SidebarItems}
          subdomain={subdomains.CALLDATA.base}
        />
        <Center flexDir={"column"} w="full" alignItems="stretch" justifyContent="flex-start" pt={6}>
          {children}
        </Center>
      </HStack>
    </Layout>
  );
};
