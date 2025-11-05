"use client";

import { HStack, Center } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { Sidebar, SidebarItem } from "@/components/Sidebar";
import subdomains from "@/subdomains";

const SidebarItems: SidebarItem[] = [
  { name: "ETH", path: "eth" },
  { name: "Hexadecimal", path: "hexadecimal" },
  { name: "Keccak256", path: "keccak256" },
  { name: "Padding", path: "padding" },
  { name: "Address checksum", path: "address-checksum" },
  { name: "CREATE2", path: "create2" },
];

export const ConverterLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <Layout>
      <HStack alignItems={"stretch"} h="full">
        <Sidebar
          heading="Converters"
          items={SidebarItems}
          subdomain={subdomains.CONVERTER.base}
        />
        <Center flexDir={"column"} w="full">
          {children}
        </Center>
      </HStack>
    </Layout>
  );
};
