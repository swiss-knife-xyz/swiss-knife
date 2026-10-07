// creating separate component here, so that we can keep "use client" here and not in the actual layout to enable setting metadata
"use client";

import { HStack, Center, Box, Link } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { Sidebar, SidebarItem } from "@/components/Sidebar";
import subdomains from "@/subdomains";
import { getPath } from "@/utils";
import { usePathname } from "next/navigation";

const SidebarItems: SidebarItem[] = [
  { name: "Decoder", path: "decoder" },
  { name: "Encoder", path: "encoder" },
  { name: "Viem Error Simulate", path: "viem-error-simulate" },
  { name: "CoWSwap TWAP Verifier", path: "cowswap" },
];

export const CalldataLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  return (
    <Layout maxW="1760px" minW={0} allowSticky={pathname.endsWith("/decoder")}>
      <HStack
        alignItems="stretch"
        h="full"
        w="full"
        spacing={{ base: 0, md: 6 }}
        flexDir={{ base: "column", md: "row" }}
      >
        <Box display={{ base: "none", md: "block" }} flexShrink={0}>
          <Sidebar
            heading="Calldata"
            items={SidebarItems}
            subdomain={subdomains.CALLDATA.base}
          />
        </Box>
        <HStack
          as="nav"
          aria-label="Calldata tools"
          display={{ base: "flex", md: "none" }}
          w="full"
          overflowX="auto"
          spacing={4}
          pb={3}
        >
          {SidebarItems.map((item) => (
            <Link
              key={item.path}
              href={`${getPath(subdomains.CALLDATA.base)}${item.path}`}
              aria-current={
                pathname.endsWith(`/${item.path}`) ? "page" : undefined
              }
              fontWeight={
                pathname.endsWith(`/${item.path}`) ? "semibold" : "normal"
              }
              py={2}
              fontSize="sm"
              whiteSpace="nowrap"
              color="text.secondary"
            >
              {item.name}
            </Link>
          ))}
        </HStack>
        <Center
          minW={0}
          flex={1}
          flexDir={"column"}
          w="full"
          alignItems="stretch"
          justifyContent="flex-start"
          pt={6}
        >
          {children}
        </Center>
      </HStack>
    </Layout>
  );
};
