"use client";

import { HStack, Center, Flex, Spacer } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { Sidebar, SidebarItemProps } from "@/components/Sidebar";
import { ConnectButton } from "@/components/ConnectButton";

const SidebarItems: SidebarItemProps[] = [{ name: "Send Tx", path: "send-tx" }];

const TransactLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Layout>
      <HStack alignItems={"stretch"}>
        <Sidebar heading="Transact" items={SidebarItems} />
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

export default TransactLayout;
