"use client";

import { Center, Flex } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { ConnectButton } from "@/components/ConnectButton";

export const TransactLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Layout minW={0} allowSticky>
      <Flex flexDir="column" w="full" pt={4} px={4}>
        <Flex w="full" justify="flex-end" mb={6}>
          <ConnectButton />
        </Flex>
        <Center w="full" minW={0}>
          {children}
        </Center>
      </Flex>
    </Layout>
  );
};
