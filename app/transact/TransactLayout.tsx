"use client";

import { HStack, Center, Flex, Spacer } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { Sidebar, SidebarItem } from "@/components/Sidebar";
import { ConnectButton } from "@/components/ConnectButton";
import subdomains from "@/subdomains";

const SidebarItems: SidebarItem[] = [{ name: "Send Tx", path: "send-tx" }];

export const TransactLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Layout>
      <HStack alignItems={"stretch"}>
        <Sidebar
          heading="Transact"
          items={SidebarItems}
          subdomain={subdomains.TRANSACT.base}
        />
        <Flex flexDir="column" w="full" pt={4} px={4}>
          <Flex w="full" justify="flex-end" mb={6}>
            <ConnectButton />
          </Flex>
          <Center w="full">
            {children}
          </Center>
        </Flex>
      </HStack>
    </Layout>
  );
};
