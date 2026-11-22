"use client";

import { Box, HStack, Center, Link } from "@chakra-ui/react";
import {
  FiDollarSign,
  FiHash,
  FiLock,
  FiAlignLeft,
  FiCheckCircle,
} from "react-icons/fi";
import { Fuel } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Sidebar, SidebarItem } from "@/components/Sidebar";
import subdomains from "@/subdomains";
import { getPath } from "@/utils";
import { usePathname } from "next/navigation";

const SidebarItems: SidebarItem[] = [
  { name: "ETH", path: "eth", icon: FiDollarSign },
  { name: "Hexadecimal", path: "hexadecimal", icon: FiHash },
  { name: "Keccak256", path: "keccak256", icon: FiLock },
  { name: "Padding", path: "padding", icon: FiAlignLeft },
  { name: "Address checksum", path: "address-checksum", icon: FiCheckCircle },
  { name: "Gas Cost", path: "gas-cost", icon: Fuel },
];

export const ConverterLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const pathname = usePathname();
  return (
    <Layout minW={0}>
      <Box
        as="nav"
        aria-label="Converter tools"
        display={{ base: "block", md: "none" }}
        overflowX="auto"
        borderBottomWidth="1px"
        borderColor="whiteAlpha.100"
        mb={4}
      >
        <HStack spacing={4} w="max-content">
          {SidebarItems.map((item) => (
            <Link
              key={item.path}
              href={`${getPath(subdomains.CONVERTER.base)}${item.path}`}
              py={2}
              fontSize="sm"
              whiteSpace="nowrap"
              aria-current={
                pathname.endsWith(`/${item.path}`) ? "page" : undefined
              }
              color={
                pathname.endsWith(`/${item.path}`) ? "white" : "text.secondary"
              }
            >
              {item.name}
            </Link>
          ))}
        </HStack>
      </Box>
      <HStack alignItems={"flex-start"} h="full" w="full" minW={0}>
        <Box display={{ base: "none", md: "block" }} flexShrink={0}>
          <Sidebar
            heading="Converters"
            items={SidebarItems}
            subdomain={subdomains.CONVERTER.base}
          />
        </Box>
        <Center
          mt={{ base: 0, md: 8 }}
          flexDir={"column"}
          w="full"
          minW={0}
          flex={1}
        >
          {children}
        </Center>
      </HStack>
    </Layout>
  );
};
