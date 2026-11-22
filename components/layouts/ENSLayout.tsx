"use client";

import { HStack, Box, Link } from "@chakra-ui/react";
import { usePathname } from "next/navigation";
import { getPath } from "@/utils";
import { Layout } from "@/components/Layout";
import { Sidebar, SidebarItem } from "@/components/Sidebar";
import subdomains from "@/subdomains";

const SidebarItems: SidebarItem[] = [
  { name: "History", path: "history" },
  { name: "CCIP", path: "ccip" },
];

export const ENSLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  return (
    <Layout minW={0}>
      <HStack
        as="nav"
        aria-label="ENS tools"
        display={{ base: "flex", md: "none" }}
        spacing={2}
      >
        {SidebarItems.map((item) => {
          const href = `${getPath(subdomains.ENS.base)}${item.path}`;
          const active = pathname.includes(`/history`)
            ? item.path === "history"
            : item.path === "ccip";
          return (
            <Link
              key={item.path}
              href={href}
              px={4}
              py={3}
              borderRadius="md"
              bg={active ? "bg.muted" : undefined}
              aria-current={active ? "page" : undefined}
            >
              {item.name}
            </Link>
          );
        })}
      </HStack>
      <HStack alignItems={"stretch"} h="full" spacing={0} minW={0}>
        <Box display={{ base: "none", md: "block" }} flexShrink={0}>
          <Sidebar
            heading="ENS"
            items={SidebarItems}
            subdomain={subdomains.ENS.base}
          />
        </Box>
        <Box w="full" minW={0} flex={1} p={{ base: 0, md: 6 }}>
          {children}
        </Box>
      </HStack>
    </Layout>
  );
};
