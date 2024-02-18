"use client";

import { HStack, Center } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";

const CharacterCounterLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <Layout>
      <HStack alignItems={"stretch"} h="full">
        <Center flexDir={"column"} w="full">
          {children}
        </Center>
      </HStack>
    </Layout>
  );
};

export default CharacterCounterLayout;
