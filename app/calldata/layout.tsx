"use client";

import { HStack, Center } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { Sidebar, SidebarItem } from "@/components/Sidebar";
import subdomains from "@/subdomains";

const SidebarItems: SidebarItem[] = [
  { name: "Decoder", path: "decoder" },
  { name: "Encoder", path: "encoder" },
];

const CalldataLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Layout>
      <HStack alignItems={"stretch"} h="full">
        <Sidebar
          heading="Calldata"
          items={SidebarItems}
          subdomain={subdomains.CALLDATA}
        />
        <Center flexDir={"column"} w="full">
          {children}
        </Center>
      </HStack>
    </Layout>
  );
};

export default CalldataLayout;
