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
        <Center flexDir={"column"} w="full">
          <Flex w="100%" mb="3rem">
            <Spacer />
            <ConnectButton />
          </Flex>
          {children}
        </Center>
      </HStack>
    </Layout>
  );
};
