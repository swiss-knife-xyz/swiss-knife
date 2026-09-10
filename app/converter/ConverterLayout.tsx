"use client";

import { HStack, Center } from "@chakra-ui/react";
import {
  FiDollarSign,
  FiHash,
  FiLock,
  FiAlignLeft,
  FiCheckCircle,
} from "react-icons/fi";
import { Layout } from "@/components/Layout";
import { Sidebar, SidebarItem } from "@/components/Sidebar";
import subdomains from "@/subdomains";

const SidebarItems: SidebarItem[] = [
  { name: "ETH", path: "eth", icon: FiDollarSign },
  { name: "Hexadecimal", path: "hexadecimal", icon: FiHash },
  { name: "Keccak256", path: "keccak256", icon: FiLock },
  { name: "Padding", path: "padding", icon: FiAlignLeft },
  { name: "Address checksum", path: "address-checksum", icon: FiCheckCircle },
];

export const ConverterLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <Layout>
      <HStack alignItems={"flex-start"} h="full">
        <Sidebar
          heading="Converters"
          items={SidebarItems}
          subdomain={subdomains.CONVERTER.base}
        />
        <Center mt={8} flexDir={"column"} w="full" flex={1}>
          {children}
        </Center>
      </HStack>
    </Layout>
  );
};
