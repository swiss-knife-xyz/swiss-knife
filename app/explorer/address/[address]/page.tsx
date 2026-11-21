"use client";

import { use } from "react";

import { Box, HStack, Text, Icon } from "@chakra-ui/react";
import { FiCode } from "react-icons/fi";
import { ExplorerGridBase } from "@/components/explorer/ExplorerGridBase";
import { addressExplorers } from "@/data/addressExplorers";
import { ExplorerType } from "@/types";

const Address = ({
  params,
}: {
  params: Promise<{
    address: string;
  }>;
}) => {
  const { address } = use(params);
  return (
    <Box w="full" maxW="1200px" mx="auto">
      <ExplorerGridBase
        explorersData={addressExplorers}
        explorerType={ExplorerType.ADDRESS}
        addressOrTx={address}
      />
      <HStack mt={3} spacing={2} justify="center" color="text.secondary">
        <Icon as={FiCode} boxSize={4} flexShrink={0} />
        <Text fontSize="xs" color="text.secondary">= Smart contract explorers</Text>
      </HStack>
    </Box>
  );
};

export default Address;
